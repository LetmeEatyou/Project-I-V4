import Foundation
import UserNotifications

actor NotificationManager {
    static let shared = NotificationManager()

    private let center = UNUserNotificationCenter.current()
    private let prefix = "istiqamah.block."
    private var syncGeneration = 0

    func requestPermission() async throws -> Bool {
        let settings = await center.notificationSettings()
        if settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional {
            return true
        }
        guard settings.authorizationStatus == .notDetermined else { return false }
        return try await center.requestAuthorization(options: [.alert, .sound, .badge])
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
        syncGeneration &+= 1
        let generation = syncGeneration
        let generationID = UUID().uuidString
        let pending = await center.pendingNotificationRequests()
        guard generation == syncGeneration else { return "Superseded by a newer sync" }
        let owned = pending.map(\.identifier).filter { $0.hasPrefix(prefix) }
        center.removePendingNotificationRequests(withIdentifiers: owned)

        guard preferences.reminders else { return "Reminders are off" }
        do {
            guard try await requestPermission() else {
                return "Notification permission is denied"
            }
        } catch {
            return "Notification permission failed: \(error.localizedDescription)"
        }
        guard generation == syncGeneration else { return "Superseded by a newer sync" }

        let category = UNNotificationCategory(
            identifier: "ISTIQAMAH_BLOCK",
            actions: [],
            intentIdentifiers: [],
            options: []
        )
        center.setNotificationCategories([category])

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
                    "Focus until \(item.block.endTime)."
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
                content.sound = notificationSound(for: preferences.reminderSound)
                content.interruptionLevel = .timeSensitive
                content.categoryIdentifier = "ISTIQAMAH_BLOCK"
                content.userInfo = [
                    "blockID": item.block.id.uuidString,
                    "date": item.dateKey,
                    "action": alert.kind == "complete" ? "complete" : "open"
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

    private func notificationSound(for selection: ReminderSound) -> UNNotificationSound {
        guard let fileName = selection.fileName else { return .default }
        return UNNotificationSound(named: UNNotificationSoundName(rawValue: fileName))
    }
}
