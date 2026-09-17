import Combine
import SwiftUI

struct TodayView: View {
    @EnvironmentObject private var store: AppStore
    @State private var now = Date()
    let onStartBlock: () -> Void
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    private var selectedKey: String { DateTools.key(store.selectedDate) }
    private var isToday: Bool { selectedKey == DateTools.key(Date()) }

    private var selectedSchedule: [ScheduledBlock] {
        store.blocks.compactMap { block in
            guard let window = DateTools.window(for: block, on: store.selectedDate) else { return nil }
            return ScheduledBlock(
                block: block,
                dateKey: DateTools.key(window.start),
                start: window.start,
                end: window.end
            )
        }.sorted { $0.start < $1.start }
    }

    private var runningBlock: ScheduledBlock? {
        guard isToday else { return nil }
        return DateTools.activeBlock(in: store.blocks, at: now)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    dateCard
                    if let runningBlock {
                        focusCard(runningBlock)
                        actionsCard(runningBlock)
                    } else {
                        startBlockCard
                    }
                    dayList
                }
                .padding(18)
            }
            .background(AppTheme.background.ignoresSafeArea())
            .navigationTitle("Project I")
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
        .onReceive(timer) { now = $0 }
        .onReceive(store.$timelineDate) { now = $0 }
    }

    private var startBlockCard: some View {
        VStack(spacing: 14) {
            Image(systemName: "play.circle.fill")
                .font(.system(size: 38))
                .foregroundStyle(AppTheme.primary)
            Text("No block is running")
                .font(.headline)
            Text("Start a block or adjust its time in Blocks.")
                .font(.subheadline)
                .foregroundStyle(AppTheme.muted)
                .multilineTextAlignment(.center)
            Button("Start a block", systemImage: "plus") {
                onStartBlock()
            }
            .buttonStyle(.borderedProminent)
            .tint(AppTheme.primary)
        }
        .frame(maxWidth: .infinity)
        .padding(28)
        .istiqamahCard()
    }

    private var dateCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("CURRENT DATE")
                .font(.caption2.bold())
                .tracking(1.4)
                .foregroundStyle(AppTheme.muted)
            HStack {
                Button { moveDay(-1) } label: {
                    Image(systemName: "chevron.left").frame(width: 32, height: 32)
                }
                Spacer()
                VStack(spacing: 3) {
                    Text(DateTools.displayDate(store.selectedDate))
                        .font(.headline)
                    if !isToday {
                        Button("Return to today") { store.selectDate(Date()) }
                            .font(.caption)
                    }
                }
                Spacer()
                Button { moveDay(1) } label: {
                    Image(systemName: "chevron.right").frame(width: 32, height: 32)
                }
            }
        }
        .padding(18)
        .istiqamahCard()
    }

    private func focusCard(_ item: ScheduledBlock) -> some View {
        let phase = phase(for: item)
        let completed = item.block.completedDates.contains(item.dateKey)
        let pausedAt = store.pauseDate(for: item)
        let effectiveNow = pausedAt ?? now
        let remaining = phase == .upcoming
            ? item.start.timeIntervalSince(now)
            : item.end.timeIntervalSince(effectiveNow)
        let duration = max(1, item.end.timeIntervalSince(item.start))
        let progress = phase == .running
            ? max(0, min(1, effectiveNow.timeIntervalSince(item.start) / duration))
            : phase == .ended ? 1 : 0
        let isActivelyRunning = phase == .running && pausedAt == nil

        return VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text(phase.label)
                    .font(.caption2.bold())
                    .tracking(1.4)
                    .foregroundStyle(AppTheme.primary)
                Spacer()
                Image(systemName: pausedAt == nil ? (phase == .running ? "flame.fill" : "timer") : "pause.fill")
                    .foregroundStyle(isActivelyRunning ? AppTheme.flame : AppTheme.primary)
                    .symbolEffect(
                        .variableColor.iterative,
                        options: .repeating.speed(0.7),
                        isActive: isActivelyRunning
                    )
            }
            Text(item.block.name)
                .font(.title2.weight(.semibold))
                .lineLimit(2)
            Text(DateTools.clock(seconds: remaining))
                .font(.system(size: 46, weight: .regular, design: .monospaced))
                .monospacedDigit()
                .contentTransition(.numericText(countsDown: true))
            ProgressView(value: progress)
                .tint(AppTheme.primary)
            HStack {
                Text("\(item.block.startTime) – \(item.block.endTime)")
                    .foregroundStyle(AppTheme.muted)
                Spacer()
                if phase == .running {
                    Button(pausedAt == nil ? "Pause" : "Resume") {
                        store.togglePause(item)
                    }
                    .buttonStyle(.bordered)
                    .tint(AppTheme.primary)
                }
                Button(completed ? "Completed" : phase == .running ? "End" : "Mark complete") {
                    store.toggleBlock(item.block.id, dateKey: item.dateKey)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.primary)
                .disabled(now < item.start && !completed)
            }
            .font(.caption)
        }
        .padding(20)
        .istiqamahCard()
    }

    @ViewBuilder
    private func actionsCard(_ item: ScheduledBlock) -> some View {
        if !item.block.actions.isEmpty {
            VStack(alignment: .leading, spacing: 4) {
                Text("ACTIONS")
                    .font(.caption2.bold())
                    .tracking(1.4)
                    .foregroundStyle(AppTheme.muted)
                    .padding(.bottom, 8)
                ForEach(item.block.actions) { action in
                    let completed = action.completedDates.contains(item.dateKey)
                    Button {
                        store.toggleAction(action.id, in: item.block.id, dateKey: item.dateKey)
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: completed ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(completed ? AppTheme.primary : AppTheme.muted)
                            Text(action.name)
                                .strikethrough(completed)
                                .foregroundStyle(.white)
                            Spacer()
                        }
                        .padding(.vertical, 10)
                    }
                    .buttonStyle(.plain)
                    .disabled(now < item.start && !completed)
                }
            }
            .padding(18)
            .istiqamahCard()
        }
    }

    private var dayList: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(isToday ? "TODAY'S SYSTEM" : "SELECTED DAY'S SYSTEM")
                .font(.caption2.bold())
                .tracking(1.4)
                .foregroundStyle(AppTheme.muted)
            ForEach(selectedSchedule) { item in
                let completed = item.block.completedDates.contains(item.dateKey)
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 12) {
                        Image(systemName: completed ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(AppTheme.primary)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(item.block.name).font(.subheadline.weight(.medium))
                            Text("\(item.block.startTime) – \(item.block.endTime)")
                                .font(.caption)
                                .foregroundStyle(AppTheme.muted)
                        }
                        Spacer()
                        if now >= item.end && !completed {
                            Button("Complete") {
                                store.toggleBlock(item.block.id, dateKey: item.dateKey)
                            }
                            .font(.caption.weight(.semibold))
                            .buttonStyle(.bordered)
                            .tint(AppTheme.primary)
                            .controlSize(.small)
                        }
                    }

                    if item.block.actions.isEmpty {
                        Text("No actions")
                            .font(.caption)
                            .foregroundStyle(AppTheme.muted)
                            .padding(.leading, 36)
                    } else {
                        VStack(spacing: 8) {
                            ForEach(item.block.actions) { action in
                                let actionCompleted = action.completedDates.contains(item.dateKey)
                                Button {
                                    store.toggleAction(action.id, in: item.block.id, dateKey: item.dateKey)
                                } label: {
                                    HStack(spacing: 9) {
                                        Image(systemName: actionCompleted ? "checkmark.circle.fill" : "xmark.circle.fill")
                                            .foregroundStyle(actionCompleted ? AppTheme.primary : Color.red)
                                        Text(action.name)
                                            .font(.caption)
                                            .foregroundStyle(.white)
                                        Spacer()
                                        Text(actionCompleted ? "Done" : "Undone")
                                            .font(.caption2.weight(.semibold))
                                            .foregroundStyle(actionCompleted ? AppTheme.primary : Color.red)
                                    }
                                }
                                .buttonStyle(.plain)
                                .disabled(now < item.start && !actionCompleted)
                            }
                        }
                        .padding(.leading, 36)
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .padding(18)
        .istiqamahCard()
    }

    private func moveDay(_ amount: Int) {
        let date = Calendar.current.date(byAdding: .day, value: amount, to: store.selectedDate) ?? store.selectedDate
        store.selectDate(date)
    }

    private func phase(for item: ScheduledBlock) -> BlockPhase {
        if now < item.start { return .upcoming }
        if now < item.end { return .running }
        return .ended
    }
}

private enum BlockPhase {
    case upcoming
    case running
    case ended

    var label: String {
        switch self {
        case .upcoming: "NEXT BLOCK"
        case .running: "RUNNING BLOCK"
        case .ended: "BLOCK ENDED"
        }
    }
}
