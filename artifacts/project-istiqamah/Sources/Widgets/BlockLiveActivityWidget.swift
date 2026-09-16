import ActivityKit
import SwiftUI
import WidgetKit

struct BlockLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BlockActivityAttributes.self) { context in
            lockScreen(context)
                .activityBackgroundTint(Color(red: 0.06, green: 0.06, blue: 0.06))
                .activitySystemActionForegroundColor(.white)
                .widgetURL(context.attributes.deepLink)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    remainingTimer(context)
                        .padding(.leading, 6)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(context.isStale ? "BLOCK ENDED" : "RUNNING BLOCK")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.indigo.opacity(0.9))
                        Text(context.state.blockName)
                            .font(.subheadline.weight(.semibold))
                            .lineLimit(1)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    flame(size: 25)
                        .padding(.trailing, 8)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text(context.isStale ? "Finished your block?" : context.state.timeLabel)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Spacer()
                        if let deepLink = context.attributes.deepLink {
                            Link(context.isStale ? "Record complete" : "Open app", destination: deepLink)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.indigo)
                        }
                    }
                    .padding(.horizontal, 8)
                }
            } compactLeading: {
                flame(size: 16)
            } compactTrailing: {
                Text(
                    timerInterval: context.state.startDate...context.state.endDate,
                    pauseTime: context.state.endDate,
                    countsDown: true,
                    showsHours: true
                )
                .font(.system(size: 13, weight: .semibold, design: .monospaced))
                .monospacedDigit()
                .frame(maxWidth: 62)
            } minimal: {
                flame(size: 15)
            }
            .widgetURL(context.attributes.deepLink)
            .keylineTint(.orange)
        }
    }

    private func lockScreen(_ context: ActivityViewContext<BlockActivityAttributes>) -> some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 5) {
                Text(context.isStale ? "BLOCK ENDED · TAP TO RECORD" : "BLOCK RUNNING")
                    .font(.caption2.bold())
                    .foregroundStyle(.indigo)
                Text(context.state.blockName)
                    .font(.headline)
                    .lineLimit(1)
                Text(context.state.timeLabel)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 5) {
                Text(
                    timerInterval: context.state.startDate...context.state.endDate,
                    pauseTime: context.state.endDate,
                    countsDown: true,
                    showsHours: true
                )
                .font(.title3.monospacedDigit().weight(.semibold))
                Text(context.isStale ? "Tap to record" : "Tap to open")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
    }

    private func remainingTimer(_ context: ActivityViewContext<BlockActivityAttributes>) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(
                timerInterval: context.state.startDate...context.state.endDate,
                pauseTime: context.state.endDate,
                countsDown: true,
                showsHours: true
            )
            .font(.system(size: 14, weight: .semibold, design: .monospaced))
            .monospacedDigit()
            .lineLimit(1)
            Text(context.isStale ? "ENDED" : "REMAINING")
                .font(.system(size: 8, weight: .bold))
                .foregroundStyle(.indigo)
        }
    }

    private func flame(size: CGFloat) -> some View {
        Image(systemName: "flame.fill")
            .font(.system(size: size))
            .foregroundStyle(.orange)
            .symbolEffect(.variableColor.iterative, options: .repeating.speed(0.7))
            .accessibilityLabel("Active focus block")
    }
}
