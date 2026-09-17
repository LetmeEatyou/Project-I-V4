import Foundation

struct BlockAction: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var name: String
    var completedDates: Set<String> = []
}

struct FocusBlock: Identifiable, Codable, Hashable {
    static let everyDay = Set(1...7)

    var id: UUID
    var name: String
    var startTime: String
    var endTime: String
    var note: String
    var actions: [BlockAction]
    var completedDates: Set<String>
    var weekdays: Set<Int>
    var archivedAt: Date?

    init(
        id: UUID = UUID(),
        name: String,
        startTime: String,
        endTime: String,
        note: String,
        actions: [BlockAction] = [],
        completedDates: Set<String> = [],
        weekdays: Set<Int> = FocusBlock.everyDay,
        archivedAt: Date? = nil
    ) {
        self.id = id
        self.name = name
        self.startTime = startTime
        self.endTime = endTime
        self.note = note
        self.actions = actions
        self.completedDates = completedDates
        self.weekdays = weekdays
        self.archivedAt = archivedAt
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case name
        case startTime
        case endTime
        case note
        case actions
        case completedDates
        case weekdays
        case archivedAt
    }

    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        id = try values.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        name = try values.decode(String.self, forKey: .name)
        startTime = try values.decode(String.self, forKey: .startTime)
        endTime = try values.decode(String.self, forKey: .endTime)
        note = try values.decodeIfPresent(String.self, forKey: .note) ?? ""
        actions = try values.decodeIfPresent([BlockAction].self, forKey: .actions) ?? []
        completedDates = try values.decodeIfPresent(Set<String>.self, forKey: .completedDates) ?? []
        weekdays = try values.decodeIfPresent(Set<Int>.self, forKey: .weekdays) ?? Self.everyDay
        archivedAt = try values.decodeIfPresent(Date.self, forKey: .archivedAt)
    }
}

enum ReminderSound: String, CaseIterable, Codable, Identifiable, Sendable {
    case system
    case gentleChime
    case brightBell
    case focusPulse

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: "System Default"
        case .gentleChime: "Gentle Chime"
        case .brightBell: "Bright Bell"
        case .focusPulse: "Focus Pulse"
        }
    }

    var fileName: String? {
        switch self {
        case .system: nil
        case .gentleChime: "gentle-chime.wav"
        case .brightBell: "bright-bell.wav"
        case .focusPulse: "focus-pulse.wav"
        }
    }
}

struct AppPreferences: Codable, Equatable {
    var haptics = true
    var reminders = true
    var reminderMinutes = 5
    var reminderSound: ReminderSound = .system

    private enum CodingKeys: String, CodingKey {
        case haptics
        case reminders
        case reminderMinutes
        case reminderSound
    }

    init(
        haptics: Bool = true,
        reminders: Bool = true,
        reminderMinutes: Int = 5,
        reminderSound: ReminderSound = .system
    ) {
        self.haptics = haptics
        self.reminders = reminders
        self.reminderMinutes = min(15, max(5, reminderMinutes))
        self.reminderSound = reminderSound
    }

    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        haptics = try values.decodeIfPresent(Bool.self, forKey: .haptics) ?? true
        reminders = try values.decodeIfPresent(Bool.self, forKey: .reminders) ?? true
        reminderMinutes = min(
            15,
            max(5, try values.decodeIfPresent(Int.self, forKey: .reminderMinutes) ?? 5)
        )
        reminderSound = try values.decodeIfPresent(ReminderSound.self, forKey: .reminderSound) ?? .system
    }
}

struct AppSnapshot: Codable {
    let version: Int
    let exportedAt: Date
    let blocks: [FocusBlock]
    let preferences: AppPreferences
    let pausedBlocks: [String: Date]?

    init(
        version: Int,
        exportedAt: Date,
        blocks: [FocusBlock],
        preferences: AppPreferences,
        pausedBlocks: [String: Date]? = nil
    ) {
        self.version = version
        self.exportedAt = exportedAt
        self.blocks = blocks
        self.preferences = preferences
        self.pausedBlocks = pausedBlocks
    }
}

struct ScheduledBlock: Identifiable {
    let block: FocusBlock
    let dateKey: String
    let start: Date
    let end: Date

    var id: String { "\(block.id.uuidString):\(dateKey)" }
}
