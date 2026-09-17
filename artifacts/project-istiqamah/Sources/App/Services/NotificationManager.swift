import Foundation
import UserNotifications

actor NotificationManager {
    static let shared = NotificationManager()
    static let blockStartCategoryIdentifier = "ISTIQAMAH_BLOCK_START"
    static let acknowledgeActionIdentifier = "ISTIQAMAH_I_KNOW"
    static let snoozeActionIdentifier = "ISTIQAMAH_SNOOZE"

    private let center = UNUserNotificationCenter.current()
    private let prefix = "istiqamah.block."
    private let snoozePrefix = "istiqamah.snooze."
    private var syncGeneration = 0

    static func registerCategories() {
        let acknowledge = UNNotificationAction(
            identifier: acknowledgeActionIdentifier,
            title: "I Know",
            options: []
        )
        let snooze = UNNotificationAction(
            identifier: snoozeActionIdentifier,
            title: "Snooze",
            options: []
        )
        let blockStart = UNNotificationCategory(
            identifier: blockStartCategoryIdentifier,
            actions: [acknowledge, snooze],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )
        UNUserNotificationCenter.current().setNotificationCategories([blockStart])
    }

    func requestPermission() async throws -> Bool {
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus != .denied else { return false }
        return try await center.requestAuthorization(options: [.alert, .sound, .badge, .timeSensitive])
    }

    func sendTest(preferences: AppPreferences) async -> String {
        do {
            guard try await requestPermission() else {
                return "Notifications are disabled in iOS Settings."
            }
        } catch {
            return "Permission request failed: \(error.localizedDescription)"
        }

        let content = UNMutableNotificationContent()
        content.title = "Project Istiqamah"
        content.body = "This is how your block reminders will sound."
        content.sound = notificationSound(for: preferences.reminderSound)
        content.interruptionLevel = .timeSensitive

        let request = UNNotificationRequest(
            identifier: "istiqamah.test.\(UUID().uuidString)",
            content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 2, repeats: false)
        )
        do {
            try await center.add(request)
            return "Test reminder scheduled for 2 seconds from now."
        } catch {
            return "Test failed: \(error.localizedDescription)"
        }
    }

    func sync(blocks: [FocusBlock], preferences: AppPreferences, now: Date = Date()) async -> String {
        Self.registerCategories()
        syncGeneration &+= 1
        let generation = syncGeneration
        let generationID = UUID().uuidString
        let pending = await center.pendingNotificationRequests()
        guard generation == syncGeneration else { return "Superseded by a newer sync" }
        let owned = pending.filter { request in
            if request.identifier.hasPrefix(prefix) {
                return true
            }
            guard request.identifier.hasPrefix(snoozePrefix) else { return false }
            guard preferences.reminders else { return true }
            let data = request.content.userInfo
            guard let rawBlockID = data["blockID"] as? String,
                  let blockID = UUID(uuidString: rawBlockID),
                  let block = blocks.first(where: { $0.id == blockID }),
                  block.archivedAt == nil else {
                return true
            }
            guard let dateKey = data["date"] as? String else { return false }
            return block.completedDates.contains(dateKey)
        }
        center.removePendingNotificationRequests(withIdentifiers: owned.map(\.identifier))

        guard preferences.reminders else { return "Reminders are off" }
        do {
            guard try await requestPermission() else {
                return "Notification permission is denied"
            }
        } catch {
            return "Notification permission failed: \(error.localizedDescription)"
        }
        guard generation == syncGeneration else { return "Superseded by a newer sync" }

        let schedule = DateTools.schedule(for: blocks, around: now)
        var count = 0
        var failed = 0
        var attempted = 0
        for item in schedule where !item.block.completedDates.contains(item.dateKey) {
            let reminder = item.start.addingTimeInterval(TimeInterval(-preferences.reminderMinutes * 60))
            let alerts: [(kind: String, date: Date, title: String, body: String)] = [
                (
                    "reminder",
                    reminder,
                    "\(item.block.name) starts soon",
                    "Your block begins in \(preferences.reminderMinutes) minutes."
                ),
                (
                    "start",
                    item.start,
                    "\(item.block.name) is starting now",
                    "Focus until \(item.block.endTime). Choose I Know or snooze this alert."
                ),
                (
                    "complete",
                    item.end,
                    "\(item.block.name) has ended",
                    "Tap to record whether you completed this block."
                )
            ]

            for alert in alerts where alert.date > now && attempted < 60 {
                guard generation == syncGeneration else { return "Superseded by a newer sync" }
                attempted += 1
                let content = UNMutableNotificationContent()
                content.title = alert.title
                content.body = alert.body
                content.sound = alert.kind == "start"
                    ? blockStartSound(for: preferences.reminderSound)
                    : notificationSound(for: preferences.reminderSound)
                content.interruptionLevel = .timeSensitive
                if alert.kind == "start" {
                    content.categoryIdentifier = Self.blockStartCategoryIdentifier
                }
                content.userInfo = [
                    "blockID": item.block.id.uuidString,
                    "blockName": item.block.name,
                    "blockEnd": item.end.timeIntervalSince1970,
                    "date": item.dateKey,
                    "action": alert.kind == "complete" ? "complete" : "open",
                    "snoozeMinutes": preferences.snoozeMinutes,
                    "reminderSound": preferences.reminderSound.rawValue
                ]
                let components = Calendar.current.dateComponents(
                    [.year, .month, .day, .hour, .minute, .second],
                    from: alert.date
                )
                let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
                let identifier = "\(prefix)\(generationID).\(item.id).\(alert.kind)"
                do {
                    try await center.add(UNNotificationRequest(
                        identifier: identifier,
                        content: content,
                        trigger: trigger
                    ))
                    count += 1
                } catch {
                    failed += 1
                }
                guard generation == syncGeneration else {
                    center.removePendingNotificationRequests(withIdentifiers: [identifier])
                    return "Superseded by a newer sync"
                }
            }
        }
        if failed > 0 {
            return "Scheduled \(count) reminders; \(failed) failed"
        }
        return "Scheduled \(count) reminders"
    }

    @discardableResult
    func snoozeBlockStart(
        blockID: UUID?,
        blockName: String,
        blockEnd: Date?,
        dateKey: String?,
        minutes: Int,
        sound: ReminderSound
    ) async -> Bool {
        let delay = AppPreferences.normalizedSnoozeMinutes(minutes)
        let fireDate = Date().addingTimeInterval(TimeInterval(delay * 60))
        if let blockEnd, fireDate >= blockEnd {
            return false
        }

        let content = UNMutableNotificationContent()
        content.title = "\(blockName) is starting now"
        content.body = "Snoozed for \(delay) minutes. Tap I Know when you're ready to focus."
        content.sound = blockStartSound(for: sound)
        content.interruptionLevel = .timeSensitive
        content.categoryIdentifier = Self.blockStartCategoryIdentifier
        var userInfo: [String: Any] = [
            "blockName": blockName,
            "action": "open",
            "snoozeMinutes": delay,
            "reminderSound": sound.rawValue
        ]
        if let blockID {
            userInfo["blockID"] = blockID.uuidString
        }
        if let blockEnd {
            userInfo["blockEnd"] = blockEnd.timeIntervalSince1970
        }
        if let dateKey {
            userInfo["date"] = dateKey
        }
        content.userInfo = userInfo

        let request = UNNotificationRequest(
            identifier: "\(snoozePrefix)\(UUID().uuidString)",
            content: content,
            trigger: UNTimeIntervalNotificationTrigger(
                timeInterval: TimeInterval(delay * 60),
                repeats: false
            )
        )
        do {
            try await center.add(request)
            return true
        } catch {
            return false
        }
    }

    private func notificationSound(for selection: ReminderSound) -> UNNotificationSound {
        guard let fileName = selection.fileName else { return .default }
        return UNNotificationSound(named: UNNotificationSoundName(rawValue: fileName))
    }

    private func blockStartSound(for selection: ReminderSound) -> UNNotificationSound {
        if #available(iOS 26.0, *), selection == .system {
            return .defaultRingtone
        }
        return notificationSound(for: selection)
    }
}
