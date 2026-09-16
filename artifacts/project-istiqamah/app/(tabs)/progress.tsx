import Feather from "@expo/vector-icons/Feather";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { dateKey, useTasks } from "@/context/task-context";
import { useColors } from "@/hooks/useColors";

type DayPoint = { key: string; label: string; count: number };

export default function ProgressScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tasks, isReady } = useTasks();
  const today = new Date();
  const history = useMemo<DayPoint[]>(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const day = new Date(today);
        day.setDate(today.getDate() - (6 - index));
        const key = dateKey(day);
        return {
          key,
          label: day
            .toLocaleDateString("en-US", { weekday: "short" })
            .slice(0, 2)
            .toUpperCase(),
          count: tasks.filter((task) => task.completedDates.includes(key))
            .length,
        };
      }),
    [tasks, today.toDateString()],
  );

  const recordedDays = new Set(tasks.flatMap((task) => task.completedDates));
  const completedCount = tasks.reduce(
    (total, task) => total + task.completedDates.length,
    0,
  );
  const maxDay = Math.max(tasks.length, 1);
  let streak = 0;
  const streakDay = new Date(today);
  while (recordedDays.has(dateKey(streakDay))) {
    streak += 1;
    streakDay.setDate(streakDay.getDate() - 1);
  }
  const consistency = tasks.length
    ? Math.round(
        (completedCount / Math.max(recordedDays.size * tasks.length, 1)) * 100,
      )
    : 0;
  const rankedTasks = useMemo(
    () =>
      [...tasks].sort(
        (first, second) =>
          second.completedDates.length - first.completedDates.length ||
          first.name.localeCompare(second.name),
      ),
    [tasks],
  );
  const bestTask = rankedTasks[0];

  if (!isReady)
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]} />
    );

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
          THE LONG VIEW
        </Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Progress
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Notice the days you kept showing up.
        </Text>

        <View
          style={[
            styles.hero,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View>
            <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>
              CURRENT STREAK
            </Text>
            <Text style={[styles.heroNumber, { color: colors.foreground }]}>
              {streak}
            </Text>
            <Text style={[styles.heroDays, { color: colors.foreground }]}>
              {streak === 1 ? "DAY" : "DAYS"}
            </Text>
          </View>
          <View
            style={[styles.heroMark, { backgroundColor: colors.brightCard }]}
          >
            <Feather name="trending-up" size={25} color={colors.foreground} />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          LAST 7 DAYS
        </Text>
        <View
          style={[
            styles.chartCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.chartHeader}>
            <View>
              <Text style={[styles.chartTitle, { color: colors.foreground }]}>
                Daily consistency
              </Text>
              <Text
                style={[
                  styles.chartSubtitle,
                  { color: colors.mutedForeground },
                ]}
              >
                Completed blocks by day
              </Text>
            </View>
            <Text style={[styles.chartRatio, { color: colors.primary }]}>
              {completedCount} TOTAL
            </Text>
          </View>
          <View style={styles.chart}>
            {history.map((day) => (
              <View style={styles.barColumn} key={day.key}>
                <View
                  style={[styles.barTrack, { backgroundColor: colors.muted }]}
                >
                  <View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: day.count
                          ? colors.primary
                          : colors.border,
                        height: `${Math.max((day.count / maxDay) * 100, day.count ? 12 : 4)}%`,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.barLabel, { color: colors.mutedForeground }]}
                >
                  {day.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.statGrid}>
          <Stat
            label="DAYS PRACTICED"
            value={String(recordedDays.size)}
            colors={colors}
          />
          <Stat
            label="BLOCKS DONE"
            value={String(completedCount)}
            colors={colors}
          />
          <Stat label="CONSISTENCY" value={`${consistency}%`} colors={colors} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          YOUR REPEATERS
        </Text>
        <View
          style={[
            styles.taskCard,
            { backgroundColor: colors.deepCard, borderColor: colors.border },
          ]}
        >
          {rankedTasks.map((task, index) => (
            <View
              key={task.id}
              style={[
                styles.taskRow,
                { borderBottomColor: colors.border },
                index === rankedTasks.length - 1 && styles.lastRow,
              ]}
            >
              <View
                style={[
                  styles.taskDot,
                  {
                    backgroundColor:
                      index === 0 ? colors.primary : colors.muted,
                  },
                ]}
              />
              <Text
                style={[styles.taskName, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {task.name}
              </Text>
              <Text
                style={[styles.taskCount, { color: colors.mutedForeground }]}
              >
                {task.completedDates.length}{" "}
                {task.completedDates.length === 1 ? "day" : "days"}
              </Text>
            </View>
          ))}
          {!tasks.length && (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Add tasks to start building a record.
            </Text>
          )}
        </View>
        <Text style={[styles.footerNote, { color: colors.mutedForeground }]}>
          {bestTask
            ? `${bestTask.name} is currently your most consistent block.`
            : "A record starts with one completed block."}
        </Text>
      </ScrollView>
    </View>
  );
}

function Stat({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: colors.foreground }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loading: { flex: 1 },
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
    marginBottom: 28,
  },
  hero: {
    minHeight: 158,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  heroLabel: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1.4 },
  heroNumber: {
    fontSize: 62,
    lineHeight: 68,
    fontFamily: "Inter_400Regular",
    letterSpacing: -3,
    marginTop: 5,
  },
  heroDays: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    marginTop: -2,
  },
  heroMark: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
    marginBottom: 11,
  },
  chartCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 17,
    marginBottom: 24,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  chartTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  chartSubtitle: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 4 },
  chartRatio: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  chart: {
    height: 156,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 22,
  },
  barColumn: {
    height: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  barTrack: {
    height: 122,
    width: "100%",
    maxWidth: 24,
    borderRadius: 12,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: { width: "100%", borderRadius: 12 },
  barLabel: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  statGrid: { flexDirection: "row", marginBottom: 29 },
  stat: { flex: 1 },
  statLabel: {
    fontSize: 7,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    marginBottom: 7,
  },
  statValue: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  taskCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 14,
  },
  taskRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    borderBottomWidth: 1,
  },
  lastRow: { borderBottomWidth: 0 },
  taskDot: { width: 7, height: 7, borderRadius: 4, marginRight: 12 },
  taskName: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  taskCount: { fontSize: 10, fontFamily: "Inter_400Regular" },
  emptyText: { fontSize: 11, fontFamily: "Inter_400Regular", padding: 18 },
  footerNote: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
