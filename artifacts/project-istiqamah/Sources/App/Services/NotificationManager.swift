import Foundation
import UserNotifications

actor NotificationManager {
    static let shared = NotificationManager()

    private let center = UNUserNotificationCenter.current()
    private let prefix = "istiqamah.block."

    func requestPermission() async -> Bool {
        let settings = await center.notificationSettings()
        if settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional {
            return true
        }
        guard settings.authorizationStatus == .notDetermined else { return false }
        return (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
    }

    func sync(blocks: [FocusBlock], preferences: AppPreferences, now: Date = Date()) async {
        let pending = await center.pendingNotificationRequests()
        let owned = pending.map(\.identifier).filter { $0.hasPrefix(prefix) }
        center.removePendingNotificationRequests(withIdentifiers: owned)

        guard preferences.reminders, await requestPermission() else { return }

        let category = UNNotificationCategory(
            identifier: "ISTIQAMAH_BLOCK",
            actions: [],
            intentIdentifiers: [],
            options: []
        )
        center.setNotificationCategories([category])

        let schedule = DateTools.schedule(for: blocks, around: now)
        var count = 0
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

            for alert in alerts where alert.date > now && count < 60 {
                let content = UNMutableNotificationContent()
                content.title = alert.title
                content.body = alert.body
                content.sound = .default
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
                let identifier = "\(prefix)\(item.id).\(alert.kind)"
                try? await center.add(UNNotificationRequest(
                    identifier: identifier,
                    content: content,
                    trigger: trigger
                ))
                count += 1
            }
        }
    }
}
