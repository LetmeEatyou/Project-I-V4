import SwiftUI
import UIKit
import UserNotifications

struct SettingsView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.openURL) private var openURL
    @State private var backupURL: URL?
    @State private var notificationStatus = "Checking…"

    var body: some View {
        NavigationStack {
            Form {
                Section("Preferences") {
                    Toggle("Haptic feedback", isOn: preferenceBinding(\.haptics))
                    Toggle("Block reminders", isOn: preferenceBinding(\.reminders))
                    Stepper(
                        "Remind me \(store.preferences.reminderMinutes) minutes early",
                        value: reminderBinding,
                        in: 5...15,
                        step: 5
                    )
                }

                Section("Live blocks") {
                    Label("Dynamic Island & Lock Screen", systemImage: "flame.fill")
                        .foregroundStyle(AppTheme.flame)
                    Text("ActivityKit schedules upcoming blocks on iOS 26 and starts the current block when the app is active on earlier supported versions.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Button("Refresh Live Activities") {
                        store.refreshSystemFeatures()
                    }
                }

                Section("Notifications") {
                    LabeledContent("Permission", value: notificationStatus)
                    Button("Open iOS Settings") {
                        if let url = URL(string: UIApplication.openSettingsURLString) {
                            openURL(url)
                        }
                    }
                }

                Section("Your data") {
                    Button("Prepare JSON backup", systemImage: "square.and.arrow.up") {
                        backupURL = try? store.exportBackup()
                    }
                    if let backupURL {
                        ShareLink(item: backupURL) {
                            Label("Share backup", systemImage: "paperplane")
                        }
                    }
                    Text("Data is stored privately in the app's Application Support directory.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Section("About") {
                    LabeledContent("Project Istiqamah", value: "1.0.0")
                    Text("A private practice of showing up, one block at a time.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .scrollContentBackground(.hidden)
            .background(AppTheme.background)
            .navigationTitle("Settings")
            .task { await loadNotificationStatus() }
        }
    }

    private func preferenceBinding(_ keyPath: WritableKeyPath<AppPreferences, Bool>) -> Binding<Bool> {
        Binding(
            get: { store.preferences[keyPath: keyPath] },
            set: { value in store.updatePreferences { $0[keyPath: keyPath] = value } }
        )
    }

    private var reminderBinding: Binding<Int> {
        Binding(
            get: { store.preferences.reminderMinutes },
            set: { value in store.updatePreferences { $0.reminderMinutes = value } }
        )
    }

    private func loadNotificationStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        notificationStatus = switch settings.authorizationStatus {
        case .authorized: "Allowed"
        case .provisional: "Provisional"
        case .denied: "Denied"
        case .notDetermined: "Not requested"
        case .ephemeral: "Temporary"
        @unknown default: "Unknown"
        }
    }
}
