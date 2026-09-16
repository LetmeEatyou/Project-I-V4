# Project Istiqamah

Project Istiqamah is a private, local-first time-blocking and consistency app built with Expo and React Native. It helps you define intentional blocks for the day, break them into small actions, record completion, and review your consistency over time.

The main application lives in [`artifacts/project-istiqamah`](artifacts/project-istiqamah).

## How it works

1. Open **Blocks** and create a time block with a name, start and end time, note, and up to five actions.
2. Use **Today** to move between dates, see the current or next block, and mark blocks or actions complete.
3. The live timer counts down to an upcoming block or shows the time remaining in an active block.
4. Open **Progress** to review the last seven days, total completions, consistency, current streak, and most frequently completed block.
5. Use **Settings** to control haptics, choose a reminder lead time from 5–165 minutes, or export a JSON backup.

Tasks, completion history, and preferences are stored on the device with AsyncStorage. No account or backend is required for the current app. First-time users receive four example blocks, which can be edited or deleted.

## Features

- Create, edit, and delete daily time blocks
- Start/end time validation, including blocks that cross midnight
- Up to five checklist actions per block
- Completion tracking for any selected date
- Live countdown and active-block progress indicator
- Previous/next day navigation and a quick return to today
- Seven-day completion chart, streaks, consistency statistics, and per-block totals
- Configurable 5–165 minute reminders plus start and completion alerts
- Time-sensitive notification sound on iOS and a maximum-importance alarm channel on Android
- iOS Live Activity with a native countdown on the Lock Screen and Dynamic Island on supported iPhones
- One-tap completion recording after a block ends from a Live Activity or completion notification
- Optional haptic feedback
- Local persistence and migration from older saved-data formats
- JSON backup export through the native share sheet
- Light/dark system theme support (the current palette intentionally uses the same dark visual style for both)
- iOS, Android, and web targets through Expo

## Current limitations and pending work

These items are not implemented yet:

- **Apple Screen Time data:** app-usage monitoring needs a native iOS module plus Apple's Family Controls entitlement and cannot run in Expo Go.
- **Remote Live Activity start:** a Live Activity starts automatically while the app process is active. Starting it when the app has been fully terminated requires an APNs push-to-start service and Apple push credentials; scheduled reminder/start/end notifications still work without that service.
- **Critical alarm audio on iOS:** alerts are time-sensitive and play sound, but bypassing silent mode requires Apple's restricted Critical Alerts entitlement. The app cannot legally force unrestricted or continuously looping alarm audio without it.
- **Automatic iCloud restore:** data is local to the installed app. Deleting the app also removes its local data, so users should export a backup first.
- **Backup import:** the app can export JSON but does not yet restore from an exported file.
- **Cloud sync and accounts:** there is currently no cross-device synchronization or sign-in.
- **Automated tests:** the project has TypeScript checks but no unit, integration, or end-to-end test suite yet.
- **Accessibility and localization audit:** labels exist for key controls, but the full app still needs screen-reader, dynamic-type, contrast, and translated-copy testing.

## What could be improved

- Add backup import with schema validation and a preview before replacing local data.
- Add optional encrypted cloud backup and multi-device sync without making an account mandatory.
- Add flexible reminder lead times, repeat schedules, notification categories, and clearer permission status.
- Add drag-and-drop block ordering, templates, search, tags, and archived blocks.
- Expand analytics with weekly/monthly ranges, partial-action progress, and exportable reports.
- Add a native Screen Time integration once entitlements and privacy flows are available.
- Add tests for time calculations, storage migration, task editing, notification scheduling, and progress statistics.
- Replace duplicated visual tokens and add a true light theme.

## Requirements

- Node.js 24
- pnpm 10.34.5 (declared in the root `package.json`)

## Install

From the repository root:

```bash
pnpm install --frozen-lockfile
```

## Run the app

The repository's `dev` script is configured for its hosted Replit environment. For normal local Expo development, run:

```bash
pnpm --filter @workspace/project-istiqamah exec expo start
```

Then choose iOS, Android, or web from the Expo terminal. Native notifications require a supported iOS or Android build; web does not schedule them.

Live Activities require a native iOS build and do not work in Expo Go. They appear on the Lock Screen on supported iOS versions and in the Dynamic Island on compatible iPhone models. The `expo-widgets` config plugin creates the required widget extension during native generation.

To produce and serve the hosted Expo manifests and native bundles:

```bash
pnpm --filter @workspace/project-istiqamah run build
pnpm --filter @workspace/project-istiqamah run serve
```

The build expects one of `REPLIT_INTERNAL_APP_DOMAIN`, `REPLIT_DEV_DOMAIN`, or `EXPO_PUBLIC_DOMAIN` to identify its public host. The static server uses `PORT` when set and otherwise listens on port `3000`.

## Validate

```bash
# Check all TypeScript workspaces
pnpm run typecheck

# Type-check only the mobile app
pnpm --filter @workspace/project-istiqamah run typecheck

# Type-check and build every package that defines a build script
pnpm run build
```

## Repository structure

| Path                                    | Purpose                                                            |
| --------------------------------------- | ------------------------------------------------------------------ |
| `artifacts/project-istiqamah/app`       | Expo Router screens and navigation                                 |
| `artifacts/project-istiqamah/context`   | Task state, preferences, persistence, and data migration           |
| `artifacts/project-istiqamah/lib`       | Time and notification helpers                                      |
| `artifacts/project-istiqamah/constants` | Shared visual tokens                                               |
| `artifacts/project-istiqamah/scripts`   | Static web export tooling                                          |
| `artifacts/project-istiqamah/server`    | Static-build server and landing page                               |
| `artifacts/api-server`                  | Separate starter API artifact; not used by the current mobile app  |
| `artifacts/mockup-sandbox`              | Separate UI mockup artifact; not used by the current mobile app    |
| `lib`                                   | Shared database and generated API packages for workspace expansion |
| `docs/github-actions-ios.md`            | iOS build notes                                                    |

## Data and privacy

The current product does not send task data to the included API starter. Task content and preferences remain in AsyncStorage on the device unless the user explicitly shares an exported backup. Notification permission is requested only when reminders are enabled on a native device.

## License

MIT
