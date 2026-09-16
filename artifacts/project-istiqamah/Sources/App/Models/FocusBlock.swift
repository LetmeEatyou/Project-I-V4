import Foundation

struct BlockAction: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var name: String
    var completedDates: Set<String> = []
}

struct FocusBlock: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var name: String
    var startTime: String
    var endTime: String
    var note: String
    var actions: [BlockAction] = []
    var completedDates: Set<String> = []
}

struct AppPreferences: Codable, Equatable {
    var haptics = true
    var reminders = true
    var reminderMinutes = 5
}

struct AppSnapshot: Codable {
    let version: Int
    let exportedAt: Date
    let blocks: [FocusBlock]
    let preferences: AppPreferences
}

struct ScheduledBlock: Identifiable {
    let block: FocusBlock
    let dateKey: String
    let start: Date
    let end: Date

    var id: String { "\(block.id.uuidString):\(dateKey)" }
}
