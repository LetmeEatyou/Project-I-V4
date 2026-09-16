import Feather from "@expo/vector-icons/Feather";
import React from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  MAX_REMINDER_MINUTES,
  MIN_REMINDER_MINUTES,
  useTasks,
} from "@/context/task-context";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { preferences, setPreference, tasks } = useTasks();
  const exportBackup = () => {
    const backup = JSON.stringify(
      {
        app: "Project Istiqamah",
        version: 1,
        exportedAt: new Date().toISOString(),
        tasks,
        preferences,
      },
      null,
      2,
    );
    if (Platform.OS === "web") {
      Alert.alert(
        "Backup ready",
        "Open Project Istiqamah on your iPhone to export this backup through the native share sheet.",
      );
      return;
    }
    Share.share({ title: "Project Istiqamah backup", message: backup }).catch(
      () => undefined,
    );
  };
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        alwaysBounceVertical={false}
        bounces={false}
        contentInsetAdjustmentBehavior="never"
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 22, paddingBottom: 92 },
        ]}
      >
        <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>
          YOUR ENVIRONMENT
        </Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Settings
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Keep the system quiet enough to use.
        </Text>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          DAILY EXPERIENCE
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <SettingRow
            icon="volume-2"
            title="Haptic feedback"
            description="A small response when you log a task."
            colors={colors}
            value={preferences.haptics}
            onValueChange={(value) => setPreference("haptics", value)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="bell"
            title="Reminders"
            description="Notify you before each upcoming block."
            colors={colors}
            value={preferences.reminders}
            onValueChange={(value) => setPreference("reminders", value)}
          />
          {preferences.reminders && (
            <>
              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />
              <ReminderLeadTime
                colors={colors}
                value={preferences.reminderMinutes}
                onChange={(value) => setPreference("reminderMinutes", value)}
              />
            </>
          )}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          LIVE BLOCKS
        </Text>
        <View
          style={[
            styles.liveCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[styles.settingIcon, { backgroundColor: colors.secondary }]}
          >
            <Feather name="radio" size={16} color={colors.foreground} />
          </View>
          <View style={styles.liveCopy}>
            <Text style={[styles.settingTitle, { color: colors.foreground }]}>
              Dynamic Island & Lock Screen
            </Text>
            <Text
              style={[
                styles.settingDescription,
                { color: colors.mutedForeground },
              ]}
            >
              At the target time, an active block shows a live countdown on
              supported iPhones. Hold the Dynamic Island to expand it; tapping
              opens the app.
            </Text>
            <Text style={[styles.nativeNote, { color: colors.primary }]}>
              REQUIRES A NATIVE IOS BUILD · NOT EXPO GO
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          IOS FOCUS DATA
        </Text>
        <View
          style={[
            styles.usageCard,
            { backgroundColor: colors.brightCard, borderColor: colors.border },
          ]}
        >
          <View style={styles.usageHeader}>
            <View
              style={[styles.usageIcon, { backgroundColor: colors.accent }]}
            >
              <Feather name="activity" size={18} color={colors.primary} />
            </View>
            <View style={styles.usageHeading}>
              <Text style={[styles.usageTitle, { color: colors.foreground }]}>
                App usage monitoring
              </Text>
              <Text style={[styles.comingSoon, { color: colors.primary }]}>
                NATIVE MODULE NEXT
              </Text>
            </View>
          </View>
          <Text style={[styles.usageText, { color: colors.accentForeground }]}>
            Project Istiqamah can be extended with Apple&apos;s Screen Time APIs
            to compare your focus blocks with real device usage. That requires
            an iOS build with Apple&apos;s Family Controls entitlement; it
            cannot run inside Expo Go.
          </Text>
          <Pressable
            onPress={() =>
              Linking.openURL(
                "https://developer.apple.com/documentation/familycontrols",
              )
            }
            style={({ pressed }) => [
              styles.learnButton,
              { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.learnText, { color: colors.primary }]}>
              Learn about the iOS requirement
            </Text>
            <Feather name="external-link" size={14} color={colors.primary} />
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          YOUR DATA
        </Text>
        <View
          style={[
            styles.backupCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.backupCopy}>
            <Text style={[styles.backupTitle, { color: colors.foreground }]}>
              Keep a copy of your system
            </Text>
            <Text
              style={[styles.backupText, { color: colors.mutedForeground }]}
            >
              Your tasks are stored locally. Export a backup before deleting the
              app or moving phones.
            </Text>
          </View>
          <Pressable
            testID="export-backup"
            onPress={exportBackup}
            style={({ pressed }) => [
              styles.exportButton,
              {
                backgroundColor: colors.secondary,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="upload" size={15} color={colors.foreground} />
            <Text style={[styles.exportText, { color: colors.foreground }]}>
              Export backup
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.backupNote, { color: colors.mutedForeground }]}>
          Automatic iCloud restore is a native iOS follow-up. iOS clears an
          app&apos;s local storage when the app is deleted.
        </Text>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          ABOUT
        </Text>
        <View style={[styles.about, { borderColor: colors.border }]}>
          <Text style={[styles.aboutName, { color: colors.foreground }]}>
            Project Istiqamah
          </Text>
          <Text style={[styles.aboutCopy, { color: colors.mutedForeground }]}>
            A private practice of showing up, one block at a time.
          </Text>
          <View style={styles.versionRow}>
            <Text style={[styles.version, { color: colors.mutedForeground }]}>
              VERSION
            </Text>
            <Text style={[styles.versionValue, { color: colors.foreground }]}>
              1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingRow({
  icon,
  title,
  description,
  colors,
  value,
  onValueChange,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  description: string;
  colors: ReturnType<typeof useColors>;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={16} color={colors.foreground} />
      </View>
      <View style={styles.settingCopy}>
        <Text style={[styles.settingTitle, { color: colors.foreground }]}>
          {title}
        </Text>
        <Text
          style={[styles.settingDescription, { color: colors.mutedForeground }]}
        >
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.muted, true: colors.accent }}
        thumbColor={value ? colors.primary : colors.mutedForeground}
      />
    </View>
  );
}

function ReminderLeadTime({
  colors,
  value,
  onChange,
}: {
  colors: ReturnType<typeof useColors>;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.reminderRow}>
      <View style={styles.settingCopy}>
        <Text style={[styles.settingTitle, { color: colors.foreground }]}>
          Remind me early
        </Text>
        <Text
          style={[styles.settingDescription, { color: colors.mutedForeground }]}
        >
          Choose 5, 10, or 15 minutes before every block.
        </Text>
      </View>
      <View style={styles.stepper}>
        <Pressable
          accessibilityLabel="Reduce reminder time"
          disabled={value <= MIN_REMINDER_MINUTES}
          onPress={() => onChange(Math.max(MIN_REMINDER_MINUTES, value - 5))}
          style={({ pressed }) => [
            styles.stepButton,
            {
              borderColor: colors.border,
              opacity:
                value <= MIN_REMINDER_MINUTES ? 0.35 : pressed ? 0.65 : 1,
            },
          ]}
        >
          <Feather name="minus" size={15} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.stepValue, { color: colors.foreground }]}>
          {value} min
        </Text>
        <Pressable
          accessibilityLabel="Increase reminder time"
          disabled={value >= MAX_REMINDER_MINUTES}
          onPress={() => onChange(Math.min(MAX_REMINDER_MINUTES, value + 5))}
          style={({ pressed }) => [
            styles.stepButton,
            {
              borderColor: colors.border,
              opacity:
                value >= MAX_REMINDER_MINUTES ? 0.35 : pressed ? 0.65 : 1,
            },
          ]}
        >
          <Feather name="plus" size={15} color={colors.foreground} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { paddingHorizontal: 18 },
  eyebrow: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.6,
    marginBottom: 7,
  },
  title: { fontSize: 34, fontFamily: "Inter_400Regular", letterSpacing: -1 },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 5,
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
    marginBottom: 11,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 29,
  },
  settingRow: { minHeight: 76, flexDirection: "row", alignItems: "center" },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settingCopy: { flex: 1, paddingRight: 10 },
  settingTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  settingDescription: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  divider: { height: 1 },
  reminderRow: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: {
    width: 47,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  liveCard: {
    minHeight: 104,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 29,
  },
  liveCopy: { flex: 1, paddingTop: 2 },
  nativeNote: {
    fontSize: 7,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    marginTop: 8,
  },
  usageCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 17,
    marginBottom: 29,
  },
  usageHeader: { flexDirection: "row", alignItems: "center" },
  usageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  usageHeading: { flex: 1 },
  usageTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  comingSoon: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    marginTop: 5,
  },
  usageText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginTop: 16,
  },
  learnButton: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 21,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
  },
  learnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  backupCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  backupCopy: { paddingRight: 6 },
  backupTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  backupText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
    marginTop: 5,
  },
  exportButton: {
    minHeight: 42,
    borderRadius: 21,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 15,
  },
  exportText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  backupNote: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
    marginBottom: 29,
  },
  about: { borderTopWidth: 1, paddingTop: 15 },
  aboutName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  aboutCopy: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    marginTop: 6,
  },
  versionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  version: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  versionValue: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
});
