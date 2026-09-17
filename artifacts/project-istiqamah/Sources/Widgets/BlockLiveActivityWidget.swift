import ActivityKit
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
                    activityIcon(context, size: 22)
                        .padding(.leading, 8)
                }

                DynamicIslandExpandedRegion(.center) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(statusLabel(context))
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(accent)
                        Text(context.state.blockName)
                            .font(.subheadline.weight(.semibold))
                            .lineLimit(1)
                    }
                }

                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        countdown(context)
                            .font(.system(size: 15, weight: .semibold, design: .rounded))
                        Text("REMAINING")
                            .font(.system(size: 8, weight: .semibold))
                            .foregroundStyle(.secondary)
                    }
                    .padding(.trailing, 8)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 9) {
                        progress(context)
                            .tint(accent)

                        HStack(spacing: 8) {
                            Text(context.state.timeLabel)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            Spacer(minLength: 8)
                            activityActions(context)
                        }
                    }
                    .padding(.horizontal, 8)
                    .padding(.top, 2)
                }
            } compactLeading: {
                HStack(spacing: 4) {
                    activityIcon(context, size: 13)
                    Text(context.state.blockName)
                        .font(.caption2.weight(.semibold))
                        .lineLimit(1)
                }
            } compactTrailing: {
                compactTimer(context)
            } minimal: {
                activityIcon(context, size: 14)
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
                    Text(context.state.blockName)
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
                Text(context.state.timeLabel)
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
            if let pauseLink = context.attributes.deepLink(
                action: context.state.isPaused ? "resume" : "pause"
            ) {
                Link(destination: pauseLink) {
                    Label(
                        context.state.isPaused ? "Resume" : "Pause",
                        systemImage: context.state.isPaused ? "play.fill" : "pause.fill"
                    )
                    .font(.caption2.weight(.semibold))
                }
                .buttonStyle(.bordered)
                .tint(accent)
                .controlSize(.small)
            }

            if let endLink = context.attributes.deepLink(action: "end") {
                Link(destination: endLink) {
                    Text("End")
                        .font(.caption2.weight(.semibold))
                }
                .buttonStyle(.borderedProminent)
                .tint(accent)
                .controlSize(.small)
            }
        }
    }

    private func compactTimer(_ context: ActivityViewContext<BlockActivityAttributes>) -> some View {
        countdown(context)
            .font(.system(size: 11, weight: .semibold, design: .rounded))
            .minimumScaleFactor(0.72)
            .lineLimit(1)
            .foregroundStyle(accent)
            .frame(maxWidth: 58)
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
                isActive: isActive
            )
            .contentTransition(.symbolEffect(.replace))
            .accessibilityLabel(isActive ? "Block running" : "Block paused")
    }

    private func statusLabel(_ context: ActivityViewContext<BlockActivityAttributes>) -> String {
        if context.isStale { return "BLOCK ENDED" }
        if context.state.isPaused { return "PAUSED" }
        return "FOCUS"
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
