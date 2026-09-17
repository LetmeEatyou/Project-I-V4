import SwiftUI

struct BlocksView: View {
    @EnvironmentObject private var store: AppStore
    @State private var draft: FocusBlock?
    @State private var editMode: EditMode = .inactive

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(store.blocks) { block in
                        HStack(spacing: 14) {
                            Image(systemName: "clock")
                                .foregroundStyle(AppTheme.primary)
                                .frame(width: 34, height: 34)
                                .background(AppTheme.raised)
                                .clipShape(Circle())
                            VStack(alignment: .leading, spacing: 4) {
                                Text(block.name)
                                    .font(.headline)
                                    .foregroundStyle(.white)
                                Text("\(block.startTime) – \(block.endTime) · \(block.actions.count) actions")
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.muted)
                            }
                            Spacer()
                        }
                        .padding(.vertical, 6)
                        .contentShape(Rectangle())
                        .onTapGesture { draft = block }
                        .accessibilityAddTraits(.isButton)
                        .accessibilityAction { draft = block }
                        .accessibilityHint("Double-tap to edit. Use Reorder to move this block into another time slot.")
                        .listRowBackground(AppTheme.card)
                        .swipeActions {
                            Button(role: .destructive) { store.remove(block) } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                    }
                    .onMove(perform: moveBlocks)
                } footer: {
                    Text("Tap Reorder, then drag a block by its handle. The moved block and destination block exchange time slots.")
                }
            }
            .environment(\.editMode, $editMode)
            .scrollContentBackground(.hidden)
            .background(AppTheme.background)
            .navigationTitle("Blocks")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(editMode.isEditing ? "Done" : "Reorder") {
                        withAnimation(.snappy) {
                            editMode = editMode.isEditing ? .inactive : .active
                        }
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button { draft = FocusBlock(name: "", startTime: "09:00", endTime: "10:00", note: "") } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(item: $draft) { block in
                BlockEditor(block: block, existingBlocks: store.blocks) { saved in
                    if store.blocks.contains(where: { $0.id == saved.id }) {
                        store.update(saved)
                    } else {
                        store.add(saved)
                    }
                    draft = nil
                }
            }
        }
    }

    private func moveBlocks(from sourceOffsets: IndexSet, to destination: Int) {
        guard sourceOffsets.count == 1,
              let sourceIndex = sourceOffsets.first,
              store.blocks.indices.contains(sourceIndex) else { return }
        let targetIndex = destination > sourceIndex ? destination - 1 : destination
        guard store.blocks.indices.contains(targetIndex), targetIndex != sourceIndex else { return }
        store.swapBlockTimeSlots(store.blocks[sourceIndex].id, with: store.blocks[targetIndex].id)
    }
}

private struct BlockEditor: View {
    @Environment(\.dismiss) private var dismiss
    @State private var block: FocusBlock
    @State private var errorMessage: String?
    let existingBlocks: [FocusBlock]
    let onSave: (FocusBlock) -> Void

    init(
        block: FocusBlock,
        existingBlocks: [FocusBlock],
        onSave: @escaping (FocusBlock) -> Void
    ) {
        _block = State(initialValue: block)
        self.existingBlocks = existingBlocks
        self.onSave = onSave
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Block") {
                    TextField("Block name", text: $block.name)
                    TextField("Start time (HH:MM)", text: $block.startTime)
                        .keyboardType(.numbersAndPunctuation)
                    TextField("End time (HH:MM)", text: $block.endTime)
                        .keyboardType(.numbersAndPunctuation)
                    TextField("Note", text: $block.note, axis: .vertical)
                }

                Section("Actions · up to 5") {
                    ForEach($block.actions) { $action in
                        TextField("Action", text: $action.name)
                    }
                    .onDelete { block.actions.remove(atOffsets: $0) }
                    if block.actions.count < 5 {
                        Button("Add action", systemImage: "plus") {
                            block.actions.append(BlockAction(name: ""))
                        }
                    }
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage).foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle(block.name.isEmpty ? "New Block" : "Edit Block")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                }
            }
        }
    }

    private func save() {
        block.name = block.name.trimmingCharacters(in: .whitespacesAndNewlines)
        block.startTime = block.startTime.trimmingCharacters(in: .whitespacesAndNewlines)
        block.endTime = block.endTime.trimmingCharacters(in: .whitespacesAndNewlines)
        block.actions = block.actions
            .map { action in
                var action = action
                action.name = action.name.trimmingCharacters(in: .whitespacesAndNewlines)
                return action
            }
            .filter { !$0.name.isEmpty }
            .prefix(5)
            .map { $0 }
        guard !block.name.isEmpty,
              DateTools.isValid(time: block.startTime),
              DateTools.isValid(time: block.endTime) else {
            errorMessage = "Add a name and valid 24-hour times such as 05:00."
            return
        }
        if let overlappingBlock = existingBlocks.first(where: {
            $0.id != block.id && DateTools.overlaps(block, $0)
        }) {
            errorMessage = "This time overlaps \(overlappingBlock.name). Choose an open time slot."
            return
        }
        onSave(block)
    }
}
