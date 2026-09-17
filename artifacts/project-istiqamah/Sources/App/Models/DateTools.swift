import Foundation

enum DateTools {
    static func key(_ date: Date) -> String {
        let components = Calendar.current.dateComponents([.year, .month, .day], from: date)
        guard let year = components.year, let month = components.month, let day = components.day else {
            return ""
        }
        return String(format: "%04d-%02d-%02d", year, month, day)
    }

    static func date(from key: String) -> Date? {
        let parts = key.split(separator: "-", omittingEmptySubsequences: false)
        guard key.count == 10,
              parts.count == 3,
              parts[0].count == 4,
              parts[1].count == 2,
              parts[2].count == 2,
              let year = Int(parts[0]),
              let month = Int(parts[1]),
              let day = Int(parts[2]),
              let date = Calendar.current.date(from: DateComponents(
                  year: year,
                  month: month,
                  day: day
              )),
              self.key(date) == key else {
            return nil
        }
        return date
    }

    static func minutes(_ time: String) -> Int? {
        let parts = time.split(separator: ":").compactMap { Int($0) }
        guard parts.count == 2, (0...23).contains(parts[0]), (0...59).contains(parts[1]) else {
            return nil
        }
        return parts[0] * 60 + parts[1]
    }

    static func isValid(time: String) -> Bool {
        minutes(time) != nil && time.count == 5
    }

    static func overlaps(_ first: FocusBlock, _ second: FocusBlock) -> Bool {
        guard let firstStart = minutes(first.startTime),
              let firstEndValue = minutes(first.endTime),
              let secondStart = minutes(second.startTime),
              let secondEndValue = minutes(second.endTime) else { return false }
        let firstEnd = firstEndValue > firstStart ? firstEndValue : firstEndValue + 1_440
        let secondEnd = secondEndValue > secondStart ? secondEndValue : secondEndValue + 1_440
        return [-1_440, 0, 1_440].contains { offset in
            firstStart < secondEnd + offset && secondStart + offset < firstEnd
        }
    }

    static func window(for block: FocusBlock, on day: Date) -> DateInterval? {
        guard let startMinutes = minutes(block.startTime), let endMinutes = minutes(block.endTime) else {
            return nil
        }
        let calendar = Calendar.current
        let base = calendar.startOfDay(for: day)
        guard let start = calendar.date(byAdding: .minute, value: startMinutes, to: base),
              var end = calendar.date(byAdding: .minute, value: endMinutes, to: base) else {
            return nil
        }
        if end <= start {
            end = calendar.date(byAdding: .day, value: 1, to: end) ?? end
        }
        return DateInterval(start: start, end: end)
    }

    static func schedule(for blocks: [FocusBlock], around now: Date, days: Int = 7) -> [ScheduledBlock] {
        let calendar = Calendar.current
        return (-1..<days).flatMap { offset -> [ScheduledBlock] in
            guard let day = calendar.date(byAdding: .day, value: offset, to: now) else { return [] }
            return blocks.compactMap { block in
                guard let window = window(for: block, on: day) else { return nil }
                return ScheduledBlock(
                    block: block,
                    dateKey: key(window.start),
                    start: window.start,
                    end: window.end
                )
            }
        }.sorted { $0.start < $1.start }
    }

    static func activeBlock(in blocks: [FocusBlock], at now: Date) -> ScheduledBlock? {
        schedule(for: blocks, around: now, days: 2)
            .filter { $0.start <= now && now < $0.end && !$0.block.completedDates.contains($0.dateKey) }
            .min { $0.start < $1.start }
    }

    static func nextTransition(in blocks: [FocusBlock], after now: Date) -> Date? {
        schedule(for: blocks, around: now, days: 2)
            .filter { !$0.block.completedDates.contains($0.dateKey) }
            .flatMap { [$0.start, $0.end] }
            .filter { $0 > now }
            .min()
    }

    static func clock(seconds: TimeInterval) -> String {
        let safe = max(0, Int(seconds))
        let hours = safe / 3_600
        let minutes = (safe % 3_600) / 60
        let seconds = safe % 60
        if hours > 0 {
            return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%02d:%02d", minutes, seconds)
    }

    static func displayDate(_ date: Date) -> String {
        date.formatted(.dateTime.weekday(.wide).month(.wide).day().year())
    }
}
