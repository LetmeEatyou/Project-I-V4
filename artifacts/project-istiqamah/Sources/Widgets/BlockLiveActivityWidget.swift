import ActivityKit
import AppIntents
import Foundation
import SwiftUI
import WidgetKit

struct BlockLiveActivityWidget: Widget {
    private let accent = Color(red: 0.40, green: 0.43, blue: 0.96)

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BlockActivityAttributes.self) { context in
            lockScreen(context)
                .activityBackgroundTint(Color(red: 0.055, green: 0.055, blue: 0.065))
                .activitySystemActionForegroundColor(.white)
                .widgetURL(context.attributes.deepLink)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    activityIcon(context, size: 19)
                        .frame(width: 24, height: 24)
                        .padding(.leading, 12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        countdown(context)
                            .font(.system(size: 15, weight: .semibold, design: .monospaced))
                        Text(context.isStale ? "COMPLETE" : "REMAINING")
                            .font(.system(size: 8, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                    .padding(.trailing, 12)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 10) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(statusLabel(context))
                                .font(.system(size: 9, weight: .semibold))
                                .foregroundStyle(accent)
                            Text(blockTitle(context))
                                .font(.headline.weight(.semibold))
                                .lineLimit(1)
                        }

                        progress(context)
                            .tint(accent)

                        HStack(spacing: 8) {
                            Text(context.isStale ? "Completed" : context.state.timeLabel)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            Spacer(minLength: 8)
                            activityActions(context)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.top, 4)
                    .padding(.bottom, 8)
                }
            } compactLeading: {
                HStack(spacing: 4) {
                    activityIcon(context, size: 12)
                        .frame(width: 14, height: 14)
                    Text(compactTitle(context))
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                }
                .padding(.leading, 4)
                .frame(maxWidth: .infinity, alignment: .trailing)
                .accessibilityLabel("\(blockTitle(context)), \(statusLabel(context))")
            } compactTrailing: {
                compactTimer(context)
                    .padding(.trailing, 4)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } minimal: {
                activityIcon(context, size: 13)
                    .frame(width: 18, height: 18)
            }
            .widgetURL(context.attributes.deepLink)
            .keylineTint(accent)
        }
    }

    private func lockScreen(_ context: ActivityViewContext<BlockActivityAttributes>) -> some View {
        VStack(spacing: 12) {
            HStack(spacing: 11) {
                activityIcon(context, size: 24)
                VStack(alignment: .leading, spacing: 2) {
                    Text(statusLabel(context))
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(accent)
                    Text(blockTitle(context))
                        .font(.headline)
                        .lineLimit(1)
                }
                Spacer(minLength: 10)
                countdown(context)
                    .font(.title3.monospacedDigit().weight(.semibold))
            }

            progress(context)
                .tint(accent)

            HStack(spacing: 8) {
                Text(context.isStale ? "Completed" : context.state.timeLabel)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                activityActions(context)
            }
        }
        .padding(16)
    }

    @ViewBuilder
    private func activityActions(_ context: ActivityViewContext<BlockActivityAttributes>) -> some View {
        if !context.isStale {
            Button(intent: SetBlockPausedIntent(
                blockID: context.attributes.blockID,
                dateKey: context.attributes.dateKey,
                paused: !context.state.isPaused
            )) {
                Label(
                    context.state.isPaused ? "Resume" : "Pause",
                    systemImage: context.state.isPaused ? "play.fill" : "pause.fill"
                )
                .font(.caption2.weight(.semibold))
                .frame(minWidth: 58)
            }
            .buttonStyle(.borderedProminent)
            .tint(accent)
            .controlSize(.small)

            Button(intent: EndBlockIntent(
                blockID: context.attributes.blockID,
                dateKey: context.attributes.dateKey
            )) {
                Label("End", systemImage: "stop.fill")
                    .font(.caption2.weight(.semibold))
                    .frame(minWidth: 58)
            }
            .buttonStyle(.bordered)
            .tint(.white.opacity(0.82))
            .controlSize(.small)
        }
    }

    private func compactTimer(_ context: ActivityViewContext<BlockActivityAttributes>) -> some View {
        countdown(context)
            .font(.system(size: 11, weight: .semibold, design: .monospaced))
            .minimumScaleFactor(0.72)
            .lineLimit(1)
            .foregroundStyle(accent)
            .accessibilityLabel("Time remaining")
    }

    @ViewBuilder
    private func countdown(_ context: ActivityViewContext<BlockActivityAttributes>) -> some View {
        if context.isStale {
            Text("00:00")
                .monospacedDigit()
                .lineLimit(1)
        } else if let pausedAt = context.state.pausedAt {
            Text(formattedDuration(context.state.endDate.timeIntervalSince(pausedAt)))
                .monospacedDigit()
                .lineLimit(1)
        } else {
            Text(context.state.endDate, style: .timer)
                .monospacedDigit()
                .lineLimit(1)
        }
    }

    @ViewBuilder
    private func progress(_ context: ActivityViewContext<BlockActivityAttributes>) -> some View {
        if context.isStale {
            ProgressView(value: 1)
        } else if let pausedAt = context.state.pausedAt {
            ProgressView(value: progressValue(at: pausedAt, context: context))
        } else {
            ProgressView(
                timerInterval: context.state.startDate...context.state.endDate,
                countsDown: false
            )
        }
    }

    @ViewBuilder
    private func activityIcon(
        _ context: ActivityViewContext<BlockActivityAttributes>,
        size: CGFloat
    ) -> some View {
        if context.isStale {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: size, weight: .semibold))
                .foregroundStyle(accent)
                .accessibilityLabel("Block ended")
        } else {
            flame(size: size, isActive: !context.state.isPaused)
        }
    }

    private func flame(size: CGFloat, isActive: Bool) -> some View {
        FlameIcon(size: size, isActive: isActive)
    }

    private func statusLabel(_ context: ActivityViewContext<BlockActivityAttributes>) -> String {
        if context.isStale { return "BLOCK ENDED" }
        if context.state.isPaused { return "PAUSED" }
        return "FOCUS"
    }

    private func blockTitle(_ context: ActivityViewContext<BlockActivityAttributes>) -> String {
        context.isStale ? "Block complete" : context.state.blockName
    }

    private func compactTitle(_ context: ActivityViewContext<BlockActivityAttributes>) -> String {
        context.isStale ? "Done" : context.state.blockName
    }

    private func progressValue(
        at date: Date,
        context: ActivityViewContext<BlockActivityAttributes>
    ) -> Double {
        let duration = max(1, context.state.endDate.timeIntervalSince(context.state.startDate))
        return max(0, min(1, date.timeIntervalSince(context.state.startDate) / duration))
    }

    private func formattedDuration(_ interval: TimeInterval) -> String {
        let totalSeconds = max(0, Int(interval))
        let hours = totalSeconds / 3_600
        let minutes = (totalSeconds % 3_600) / 60
        let seconds = totalSeconds % 60
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

private struct FlameIcon: View {
    @Environment(\.isLuminanceReduced) private var isLuminanceReduced

    let size: CGFloat
    let isActive: Bool

    var body: some View {
        Image(systemName: "flame.fill")
            .font(.system(size: size, weight: .semibold))
            .foregroundStyle(
                LinearGradient(
                    colors: [.yellow, .orange, .red],
                    startPoint: .bottom,
                    endPoint: .top
                )
            )
            .symbolEffect(
                .variableColor.iterative,
                options: .repeating.speed(0.68),
                isActive: isActive && !isLuminanceReduced
            )
            .contentTransition(.symbolEffect(.replace))
            .accessibilityLabel(isActive ? "Block running" : "Block paused")
    }
}
