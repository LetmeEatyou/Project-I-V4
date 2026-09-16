# Project Istiqamah

Project Istiqamah is a private, local-first time-blocking and consistency app
built natively for iPhone with SwiftUI. It helps you define intentional blocks,
break them into small actions, record completion, and review consistency.

The native application lives in [`artifacts/project-istiqamah`](artifacts/project-istiqamah).

## Native iOS architecture

- SwiftUI application and navigation
- ActivityKit and WidgetKit Live Activity extension
- Codable JSON persistence in Application Support
- UserNotifications reminders, start alerts, and completion alerts
- Charts-based seven-day progress dashboard
- XcodeGen project definition committed as `project.json`
- No Expo, React Native, JavaScript bundle, CocoaPods, account, or backend

## Features

- Create, edit, and delete daily time blocks
- Validated 24-hour start and end times, including blocks crossing midnight
- Up to five checklist actions per block
- Completion tracking for any selected date
- Native live countdown and active-block progress
- Previous/next day navigation and quick return to today
- Correct seven-day totals, consistency, streaks, and per-block totals
- Configurable 5–15 minute time-sensitive notifications
- Native iOS Live Activities on the Lock Screen and Dynamic Island
- Expanded Dynamic Island with remaining time on the left and animated flame on
  the right
- Scheduled Live Activity starts on iOS 26, even when the app is backgrounded
- Live Activity and notification deep links that open the relevant block
- Optional haptic feedback
- JSON backup export through the native share sheet
- System dark appearance

## Build requirements

- macOS with Xcode 26 or later
- XcodeGen
- iOS 18 or later deployment target

Generate the Xcode project:

```bash
cd artifacts/project-istiqamah
xcodegen generate --spec project.json
open ProjectIstiqamah.xcodeproj
```

Choose an Apple development team in Xcode, then run the `ProjectIstiqamah`
scheme on an iPhone. Live Activities require a physical supported device for
complete Dynamic Island testing.

## Unsigned IPA

The GitHub workflow in `.github/workflows/build-ios-ipa.yml` generates the
Xcode project, builds the native app and widget extension, and publishes an
unsigned IPA artifact. See [`docs/github-actions-ios.md`](docs/github-actions-ios.md).

## Repository structure

| Path | Purpose |
| --- | --- |
| `artifacts/project-istiqamah/Sources/App` | SwiftUI app, persistence, notifications, and ActivityKit lifecycle |
| `artifacts/project-istiqamah/Sources/Shared` | Activity attributes shared with the widget extension |
| `artifacts/project-istiqamah/Sources/Widgets` | Native WidgetKit and Dynamic Island UI |
| `artifacts/project-istiqamah/Config` | Generated app and extension property-list paths |
| `artifacts/project-istiqamah/project.json` | XcodeGen project source of truth |
| `artifacts/api-server` | Separate starter API; unused by the iOS app |
| `artifacts/mockup-sandbox` | Separate web mockup; unused by the iOS app |

## Current limitations and next work

- Existing Expo AsyncStorage data is not automatically migrated; export it
  before installing the native rewrite if it must be retained.
- Scheduled Live Activity starts require iOS 26. On iOS 18–25, the current
  block starts its Live Activity whenever the app is active and notifications
  remain the background fallback.
- The app exports backups but does not import them yet.
- Repeat schedules, weekday selection, snooze, templates, tags, search, and
  archives are not implemented.
- Screen Time integration still requires Apple's Family Controls entitlement.
- Accessibility and localization need a complete device audit.
- Native unit, UI, and snapshot tests remain to be added.

## Data and privacy

Task content and preferences stay in the app's Application Support directory.
The iOS app does not send this information to the included API starter. Data
leaves the device only when the user explicitly shares an exported backup.

## License

MIT
