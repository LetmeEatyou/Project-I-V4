import SwiftUI
import UniformTypeIdentifiers

struct BlocksView: View {
    @EnvironmentObject private var store: AppStore
    @State private var draft: FocusBlock?
    @State private var draggedBlockID: UUID?
    @State private var dropTargetID: UUID?

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
                            Image(systemName: "line.3.horizontal")
                                .foregroundStyle(AppTheme.muted)
                                .accessibilityHidden(true)
                        }
                        .padding(.vertical, 6)
                        .contentShape(Rectangle())
                        .onTapGesture { draft = block }
                        .onDrag {
                            draggedBlockID = block.id
                            dropTargetID = nil
                            return NSItemProvider(object: block.id.uuidString as NSString)
                        }
                        .onDrop(
                            of: [UTType.text],
                            delegate: BlockSlotDropDelegate(
                                targetBlockID: block.id,
                                draggedBlockID: $draggedBlockID,
                                dropTargetID: $dropTargetID,
                                onSwap: store.swapBlockTimeSlots
                            )
                        )
                        .accessibilityAddTraits(.isButton)
                        .accessibilityAction { draft = block }
                        .accessibilityHint("Double-tap to edit. Touch and hold, then drag onto another block to swap time slots.")
                        .listRowBackground(
                            dropTargetID == block.id
                                ? AppTheme.primary.opacity(0.14)
                                : AppTheme.card
                        )
                        .animation(.easeOut(duration: 0.14), value: dropTargetID)
                        .swipeActions {
                            Button(role: .destructive) { store.remove(block) } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                    }
                } footer: {
                    Text("Touch and hold a block, then drop it on another block to swap their time slots.")
                }
            }
            .scrollContentBackground(.hidden)
            .background(AppTheme.background)
            .navigationTitle("Blocks")
            .toolbar {
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
}

private struct BlockSlotDropDelegate: DropDelegate {
    let targetBlockID: UUID
    @Binding var draggedBlockID: UUID?
    @Binding var dropTargetID: UUID?
    let onSwap: (UUID, UUID) -> Void

    func validateDrop(info: DropInfo) -> Bool {
        guard let draggedBlockID else { return false }
        return draggedBlockID != targetBlockID && info.hasItemsConforming(to: [UTType.text])
    }

    func dropEntered(info: DropInfo) {
        guard draggedBlockID != nil, draggedBlockID != targetBlockID else { return }
        dropTargetID = targetBlockID
    }

    func dropExited(info: DropInfo) {
        if dropTargetID == targetBlockID {
            dropTargetID = nil
        }
    }

    func dropUpdated(info: DropInfo) -> DropProposal? {
        DropProposal(operation: .move)
    }

    func performDrop(info: DropInfo) -> Bool {
        defer {
            draggedBlockID = nil
            dropTargetID = nil
        }
        guard let sourceBlockID = draggedBlockID,
              sourceBlockID != targetBlockID else { return false }
        withAnimation(.snappy) {
            onSwap(sourceBlockID, targetBlockID)
        }
        return true
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
