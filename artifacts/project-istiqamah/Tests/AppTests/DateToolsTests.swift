import XCTest
@testable import ProjectIstiqamah

final class DateToolsTests: XCTestCase {
    func testLegacyBlockDecodesWithEveryDaySchedule() throws {
        let json = Data(#"{"id":"00000000-0000-0000-0000-000000000001","name":"Legacy","startTime":"09:00","endTime":"10:00","note":"","actions":[],"completedDates":[]}"#.utf8)
        let block = try JSONDecoder().decode(FocusBlock.self, from: json)

        XCTAssertEqual(block.weekdays, FocusBlock.everyDay)
        XCTAssertNil(block.archivedAt)
    }

    func testWindowOnlyExistsOnSelectedWeekdays() throws {
        let day = try XCTUnwrap(DateTools.date(from: "2026-09-14"))
        let weekday = Calendar.current.component(.weekday, from: day)
        let block = FocusBlock(
            name: "Selected day",
            startTime: "09:00",
            endTime: "10:00",
            note: "",
            weekdays: [weekday]
        )
        let nextDay = try XCTUnwrap(Calendar.current.date(byAdding: .day, value: 1, to: day))

        XCTAssertNotNil(DateTools.window(for: block, on: day))
        XCTAssertNil(DateTools.window(for: block, on: nextDay))
    }

    func testOvernightBlocksOverlapAcrossWeekdayBoundary() {
        let mondayNight = FocusBlock(
            name: "Monday night",
            startTime: "23:00",
            endTime: "01:00",
            note: "",
            weekdays: [2]
        )
        let tuesdayMorning = FocusBlock(
            name: "Tuesday morning",
            startTime: "00:30",
            endTime: "01:30",
            note: "",
            weekdays: [3]
        )

        XCTAssertTrue(DateTools.overlaps(mondayNight, tuesdayMorning))
    }

    func testSameTimeOnDifferentWeekdaysDoesNotOverlap() {
        let monday = FocusBlock(
            name: "Monday",
            startTime: "09:00",
            endTime: "10:00",
            note: "",
            weekdays: [2]
        )
        let tuesday = FocusBlock(
            name: "Tuesday",
            startTime: "09:00",
            endTime: "10:00",
            note: "",
            weekdays: [3]
        )

        XCTAssertFalse(DateTools.overlaps(monday, tuesday))
    }

    func testArchivedBlockDoesNotProduceScheduleWindow() throws {
        let day = try XCTUnwrap(DateTools.date(from: "2026-09-14"))
        let block = FocusBlock(
            name: "Archived",
            startTime: "09:00",
            endTime: "10:00",
            note: "",
            archivedAt: day
        )

        XCTAssertNil(DateTools.window(for: block, on: day))
    }

    func testArchiveMetadataRoundTripsWithCompletionHistory() throws {
        let archivedAt = try XCTUnwrap(DateTools.date(from: "2026-09-17"))
        let original = FocusBlock(
            name: "Archived",
            startTime: "09:00",
            endTime: "10:00",
            note: "",
            completedDates: ["2026-09-16"],
            weekdays: [2, 4, 6],
            archivedAt: archivedAt
        )
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        let restored = try decoder.decode(FocusBlock.self, from: encoder.encode(original))

        XCTAssertEqual(restored.completedDates, original.completedDates)
        XCTAssertEqual(restored.weekdays, original.weekdays)
        XCTAssertEqual(restored.archivedAt, original.archivedAt)
    }

    @MainActor
    func testBackupValidationRejectsOverlappingActiveBlocks() {
        let first = FocusBlock(name: "One", startTime: "09:00", endTime: "10:00", note: "")
        let second = FocusBlock(name: "Two", startTime: "09:30", endTime: "10:30", note: "")
        let snapshot = AppSnapshot(
            version: 4,
            exportedAt: Date(),
            blocks: [first, second],
            preferences: AppPreferences()
        )

        XCTAssertThrowsError(try AppStore.validateBackup(snapshot))
    }

    @MainActor
    func testBackupValidationRejectsPausedStateForUnknownBlock() {
        let block = FocusBlock(name: "Known", startTime: "09:00", endTime: "10:00", note: "")
        let snapshot = AppSnapshot(
            version: 4,
            exportedAt: Date(),
            blocks: [block],
            preferences: AppPreferences(),
            pausedBlocks: ["00000000-0000-0000-0000-000000000001:2026-09-17": Date()]
        )

        XCTAssertThrowsError(try AppStore.validateBackup(snapshot))
    }
}
