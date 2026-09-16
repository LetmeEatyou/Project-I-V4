import ActivityKit
import Foundation

actor LiveActivityManager {
    static let shared = LiveActivityManager()

    func sync(blocks: [FocusBlock], now: Date = Date()) async {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

        let active = DateTools.activeBlock(in: blocks, at: now)
        let currentSchedule = Dictionary(
            uniqueKeysWithValues: DateTools.schedule(for: blocks, around: now).map {
                ("\($0.block.id.uuidString):\($0.dateKey)", $0)
            }
        )
        for activity in Activity<BlockActivityAttributes>.activities {
            let key = "\(activity.attributes.blockID.uuidString):\(activity.attributes.dateKey)"
            let scheduled = currentSchedule[key]
            let completed = scheduled?.block.completedDates.contains(activity.attributes.dateKey) ?? true
            let changed = scheduled.map {
                $0.block.name != activity.content.state.blockName ||
                $0.start != activity.content.state.startDate ||
                $0.end != activity.content.state.endDate
            } ?? true
            let tooOld = activity.content.state.endDate.addingTimeInterval(4 * 60 * 60) < now
            if completed || changed || tooOld {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }

        if let active {
            await startIfNeeded(active)
        }

        if #available(iOS 26.0, *) {
            scheduleUpcoming(blocks: blocks, now: now)
        }
    }

    func finish(blockID: UUID, dateKey: String) async {
        for activity in Activity<BlockActivityAttributes>.activities
        where activity.attributes.blockID == blockID && activity.attributes.dateKey == dateKey {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }

    private func startIfNeeded(_ item: ScheduledBlock) async {
        let existing = Activity<BlockActivityAttributes>.activities.first {
            $0.attributes.blockID == item.block.id && $0.attributes.dateKey == item.dateKey
        }
        let content = activityContent(for: item)
        if let existing {
            await existing.update(content)
            return
        }
        do {
            _ = try Activity.request(
                attributes: attributes(for: item),
                content: content,
                pushType: nil
            )
        } catch {
            // Notifications remain the fallback if ActivityKit is unavailable.
        }
    }

    @available(iOS 26.0, *)
    private func scheduleUpcoming(blocks: [FocusBlock], now: Date) {
        let existingKeys = Set(Activity<BlockActivityAttributes>.activities.map {
            "\($0.attributes.blockID.uuidString):\($0.attributes.dateKey)"
        })
        let candidates = DateTools.schedule(for: blocks, around: now)
            .filter {
                $0.start > now.addingTimeInterval(30) &&
                !$0.block.completedDates.contains($0.dateKey) &&
                !existingKeys.contains("\($0.block.id.uuidString):\($0.dateKey)")
            }
            .prefix(5)

        for item in candidates {
            let alert = AlertConfiguration(
                title: "\(item.block.name) is starting",
                body: "Your focus block is now live.",
                sound: .default
            )
            do {
                _ = try Activity.request(
                    attributes: attributes(for: item),
                    content: activityContent(for: item),
                    pushType: nil,
                    style: .standard,
                    alertConfiguration: alert,
                    start: item.start
                )
            } catch {
                break
            }
        }
    }

    private func attributes(for item: ScheduledBlock) -> BlockActivityAttributes {
        BlockActivityAttributes(blockID: item.block.id, dateKey: item.dateKey)
    }

    private func activityContent(for item: ScheduledBlock) -> ActivityContent<BlockActivityAttributes.ContentState> {
        ActivityContent(
            state: BlockActivityAttributes.ContentState(
                blockName: item.block.name,
                startDate: item.start,
                endDate: item.end,
                timeLabel: "\(item.block.startTime) – \(item.block.endTime)"
            ),
            staleDate: item.end
        )
    }
}
