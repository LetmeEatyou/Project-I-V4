import Feather from "@expo/vector-icons/Feather";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { dateKey, useTasks } from "@/context/task-context";
import { blockWindowForDate, formatClock } from "@/lib/time";
import { finishBlockLiveActivity } from "@/lib/live-activity";

const monthNames = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];
const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function TodayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const routeParams = useLocalSearchParams<{
    taskId?: string;
    date?: string;
    action?: string;
  }>();
  const { tasks, isReady, toggleTask, toggleSubtask, preferences } = useTasks();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timerNow, setTimerNow] = useState(new Date());
  const handledRoute = useRef("");
  const handledCompletion = useRef("");
  const selectedKey = dateKey(selectedDate);
  const completedCount = tasks.filter((task) =>
    task.completedDates.includes(selectedKey),
  ).length;
  const progress = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;
  const requestedTask =
    typeof routeParams.taskId === "string"
      ? tasks.find((task) => task.id === routeParams.taskId)
      : undefined;
  const focusTask =
    requestedTask ??
    tasks.find((task) => !task.completedDates.includes(selectedKey)) ??
    tasks[0];
  const isToday = dateKey(new Date()) === selectedKey;
  const focusWindow = focusTask
    ? blockWindowForDate(selectedDate, focusTask.startTime, focusTask.endTime)
    : null;
  const focusPhase =
    focusWindow && timerNow < focusWindow.start
      ? "upcoming"
      : focusWindow && timerNow < focusWindow.end
        ? "running"
        : "ended";
  const focusSeconds = focusWindow
    ? focusPhase === "upcoming"
      ? (focusWindow.start.getTime() - timerNow.getTime()) / 1000
      : (focusWindow.end.getTime() - timerNow.getTime()) / 1000
    : 0;
  const focusProgress =
    focusWindow && focusPhase === "running"
      ? Math.min(
          100,
          Math.max(
            0,
            ((timerNow.getTime() - focusWindow.start.getTime()) /
              (focusWindow.end.getTime() - focusWindow.start.getTime())) *
              100,
          ),
        )
      : focusPhase === "ended"
        ? 100
        : 0;

  useEffect(() => {
    const interval = setInterval(() => setTimerNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (
      typeof routeParams.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(routeParams.date)
    )
      return;
    const routeKey = `${routeParams.taskId ?? ""}:${routeParams.date}`;
    if (handledRoute.current === routeKey) return;
    const date = new Date(`${routeParams.date}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      handledRoute.current = routeKey;
      setSelectedDate(date);
    }
  }, [routeParams.date, routeParams.taskId]);

  useEffect(() => {
    if (
      !isReady ||
      routeParams.action !== "complete" ||
      typeof routeParams.taskId !== "string" ||
      typeof routeParams.date !== "string"
    )
      return;
    const completionKey = `${routeParams.taskId}:${routeParams.date}`;
    if (handledCompletion.current === completionKey) return;
    const task = tasks.find((candidate) => candidate.id === routeParams.taskId);
    const taskDate = new Date(`${routeParams.date}T00:00:00`);
    if (!task || Number.isNaN(taskDate.getTime())) return;
    const { end } = blockWindowForDate(taskDate, task.startTime, task.endTime);
    if (new Date() < end) return;
    handledCompletion.current = completionKey;
    if (!task.completedDates.includes(routeParams.date))
      toggleTask(task.id, routeParams.date);
    finishBlockLiveActivity(task.id, routeParams.date).catch(() => undefined);
  }, [
    isReady,
    routeParams.action,
    routeParams.date,
    routeParams.taskId,
    tasks,
    toggleTask,
  ]);

  const relativeCopy = useMemo(() => {
    if (isToday) return "Your scheduled blocks";
    return selectedDate < new Date()
      ? "Review what you completed"
      : "Plan ahead with intention";
  }, [isToday, selectedDate]);

  const shiftDay = (amount: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + amount);
    setSelectedDate(next);
  };

  const handleToggle = (id: string) => {
    const wasCompleted =
      tasks
        .find((task) => task.id === id)
        ?.completedDates.includes(selectedKey) ?? false;
    toggleTask(id, selectedKey);
    if (!wasCompleted)
      finishBlockLiveActivity(id, selectedKey).catch(() => undefined);
    if (preferences.haptics) Haptics.selectionAsync();
  };

  const handleSubtaskToggle = (taskId: string, subtaskId: string) => {
    toggleSubtask(taskId, subtaskId, selectedKey);
    if (preferences.haptics) Haptics.selectionAsync();
  };

  if (!isReady) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 110 },
        ]}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Project I
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.dateCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              CURRENT DATE
            </Text>
            <View style={styles.dateRow}>
              <Text style={[styles.dayNumber, { color: colors.foreground }]}>
                {selectedDate.getDate()}
              </Text>
              <View>
                <Text style={[styles.month, { color: colors.mutedForeground }]}>
                  {monthNames[selectedDate.getMonth()]}{" "}
                  {selectedDate.getFullYear()}
                </Text>
                <Text style={[styles.weekday, { color: colors.foreground }]}>
                  {weekDays[selectedDate.getDay()]}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.dateActions}>
            <Pressable
              accessibilityLabel="Previous day"
              testID="previous-day"
              onPress={() => shiftDay(-1)}
              style={[
                styles.roundButton,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather
                name="chevron-left"
                size={19}
                color={colors.foreground}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Next day"
              testID="next-day"
              onPress={() => shiftDay(1)}
              style={[
                styles.roundButton,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather
                name="chevron-right"
                size={19}
                color={colors.foreground}
              />
            </Pressable>
          </View>
        </View>

        {focusTask ? (
          <View
            style={[
              styles.focusCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.focusHeader}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                CURRENT BLOCK
              </Text>
              <View style={styles.activePill}>
                <View
                  style={[
                    styles.activeDot,
                    {
                      backgroundColor:
                        focusPhase === "running"
                          ? colors.primary
                          : colors.mutedForeground,
                    },
                  ]}
                />
                <Text
                  style={[styles.activeText, { color: colors.mutedForeground }]}
                >
                  {focusPhase === "running"
                    ? "RUNNING"
                    : focusPhase === "upcoming"
                      ? "UP NEXT"
                      : "ENDED"}
                </Text>
              </View>
            </View>
            <Text style={[styles.focusTitle, { color: colors.foreground }]}>
              {focusTask.name}
            </Text>
            <Text
              style={[styles.focusSubtitle, { color: colors.mutedForeground }]}
            >
              {focusTask.startTime} — {focusTask.endTime} ·{" "}
              {focusTask.description}
            </Text>
            <Text
              style={[styles.timerLabel, { color: colors.mutedForeground }]}
            >
              {focusPhase === "upcoming"
                ? "STARTS IN"
                : focusPhase === "running"
                  ? "TIME REMAINING"
                  : "BLOCK ENDED"}
            </Text>
            <Text style={[styles.timerValue, { color: colors.foreground }]}>
              {formatClock(focusSeconds)}
            </Text>
            <View
              style={[styles.progressTrack, { backgroundColor: colors.muted }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${Math.max(focusProgress, 2)}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.progressInfo}>
              <Text
                style={[styles.miniText, { color: colors.mutedForeground }]}
              >
                {Math.round(focusProgress)}% BLOCK COMPLETE
              </Text>
              <Text style={[styles.miniText, { color: colors.foreground }]}>
                {tasks.length - completedCount} BLOCKS LEFT
              </Text>
            </View>
            {focusPhase === "ended" && (
              <Pressable
                accessibilityLabel={`Record ${focusTask.name} complete`}
                onPress={() => handleToggle(focusTask.id)}
                style={({ pressed }) => [
                  styles.recordButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <Feather
                  name={
                    focusTask.completedDates.includes(selectedKey)
                      ? "rotate-ccw"
                      : "check"
                  }
                  size={16}
                  color={colors.primaryForeground}
                />
                <Text
                  style={[
                    styles.recordButtonText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  {focusTask.completedDates.includes(selectedKey)
                    ? "Undo completion"
                    : "Record completed"}
                </Text>
              </Pressable>
            )}
            {focusTask.subtasks.length > 0 && (
              <View
                style={[styles.subtaskList, { borderTopColor: colors.border }]}
              >
                <Text
                  style={[
                    styles.subtaskHeading,
                    { color: colors.mutedForeground },
                  ]}
                >
                  ACTION LIST · {focusTask.subtasks.length}
                </Text>
                {focusTask.subtasks.map((subtask) => {
                  const done = subtask.completedDates.includes(selectedKey);
                  return (
                    <Pressable
                      key={subtask.id}
                      testID={`subtask-${subtask.id}`}
                      onPress={() =>
                        handleSubtaskToggle(focusTask.id, subtask.id)
                      }
                      style={styles.subtaskRow}
                    >
                      <Feather
                        name={done ? "check-square" : "square"}
                        size={16}
                        color={done ? colors.primary : colors.mutedForeground}
                      />
                      <Text
                        style={[
                          styles.subtaskName,
                          {
                            color: done
                              ? colors.mutedForeground
                              : colors.foreground,
                            textDecorationLine: done ? "line-through" : "none",
                          },
                        ]}
                      >
                        {subtask.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.focusCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.focusTitle, { color: colors.foreground }]}>
              Make room for a plan.
            </Text>
            <Text
              style={[styles.focusSubtitle, { color: colors.mutedForeground }]}
            >
              Add your first task from the Tasks tab.
            </Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              TODAY&apos;S PLAN
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                { color: colors.mutedForeground },
              ]}
            >
              {relativeCopy}
            </Text>
          </View>
          <Text style={[styles.slotCount, { color: colors.mutedForeground }]}>
            {tasks.length} {tasks.length === 1 ? "SLOT" : "SLOTS"}
          </Text>
        </View>

        <View
          style={[
            styles.taskList,
            { backgroundColor: colors.deepCard, borderColor: colors.border },
          ]}
        >
          {tasks.map((task, index) => {
            const completed = task.completedDates.includes(selectedKey);
            return (
              <Pressable
                key={task.id}
                testID={`task-${task.id}`}
                onPress={() => handleToggle(task.id)}
                style={({ pressed }) => [
                  styles.taskRow,
                  {
                    borderBottomColor: colors.border,
                    backgroundColor: completed
                      ? colors.brightCard
                      : colors.deepCard,
                    opacity: pressed ? 0.76 : 1,
                  },
                  index === tasks.length - 1 && styles.lastRow,
                ]}
              >
                <View
                  style={[
                    styles.statusStripe,
                    {
                      backgroundColor: completed
                        ? colors.primary
                        : colors.mutedForeground,
                    },
                  ]}
                />
                <View style={styles.taskMain}>
                  <Text style={[styles.taskName, { color: colors.foreground }]}>
                    {task.name}
                  </Text>
                  <Text
                    style={[
                      styles.taskDescription,
                      {
                        color: completed
                          ? colors.accentForeground
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    {completed ? "Completed for this day" : task.description}
                  </Text>
                </View>
                <View style={styles.targetBlock}>
                  <Text
                    style={[
                      styles.smallLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    BLOCK
                  </Text>
                  <Text style={[styles.target, { color: colors.foreground }]}>
                    {task.startTime}
                  </Text>
                  <Text
                    style={[
                      styles.targetEnd,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {task.endTime}
                  </Text>
                </View>
                <View style={styles.statusBlock}>
                  <Feather
                    name={completed ? "check-circle" : "circle"}
                    size={17}
                    color={completed ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: completed
                          ? colors.accentForeground
                          : colors.foreground,
                      },
                    ]}
                  >
                    {completed ? "Done" : "Pending"}
                  </Text>
                  <Text
                    style={[
                      styles.badge,
                      {
                        color: completed
                          ? colors.primary
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    {completed ? "On track" : "Tap to log"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          {!tasks.length && (
            <View style={styles.emptyPlan}>
              <Feather name="inbox" size={22} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No tasks for this day
              </Text>
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                Build a plan from the Tasks tab.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.metrics}>
          <Metric label="PROGRESS" value={`${progress}%`} colors={colors} />
          <View
            style={[styles.metricDivider, { backgroundColor: colors.border }]}
          />
          <Metric
            label="COMPLETION"
            value={`${completedCount}/${tasks.length}`}
            colors={colors}
          />
          <View
            style={[styles.metricDivider, { backgroundColor: colors.border }]}
          />
          <Metric
            label="FOCUS"
            value={focusTask ? focusTask.startTime : "—"}
            colors={colors}
          />
        </View>

        <Pressable
          testID="add-slot"
          onPress={() => router.push("/tasks")}
          style={({ pressed }) => [
            styles.addButton,
            {
              backgroundColor: colors.secondary,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="plus" size={18} color={colors.foreground} />
          <Text style={[styles.addButtonText, { color: colors.foreground }]}>
            Manage tasks
          </Text>
          <Feather
            name="arrow-up-right"
            size={15}
            color={colors.mutedForeground}
          />
        </Pressable>
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            PROJECT ISTIQAMAH
          </Text>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            BUILD 0.1
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Metric({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, { color: colors.foreground }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { paddingHorizontal: 18 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  eyebrow: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.6,
    marginBottom: 7,
  },
  title: { fontSize: 38, fontFamily: "Inter_400Regular", letterSpacing: -1.5 },
  dateCard: {
    minHeight: 118,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  label: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  dateRow: { flexDirection: "row", alignItems: "center" },
  dayNumber: {
    fontSize: 48,
    lineHeight: 52,
    fontFamily: "Inter_400Regular",
    letterSpacing: -2,
    marginRight: 12,
  },
  month: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  weekday: { fontSize: 14, fontFamily: "Inter_500Medium" },
  dateActions: { flexDirection: "row", gap: 8 },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  focusCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 28,
  },
  focusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  activePill: { flexDirection: "row", alignItems: "center", gap: 6 },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  focusTitle: {
    fontSize: 23,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.5,
  },
  focusSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 5,
    marginBottom: 22,
  },
  timerLabel: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 34,
    lineHeight: 39,
    fontFamily: "Inter_500Medium",
    letterSpacing: -1,
    marginBottom: 14,
  },
  progressTrack: { height: 5, borderRadius: 5, overflow: "hidden" },
  progressFill: { height: "100%", minWidth: 5 },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  miniText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  recordButton: {
    minHeight: 44,
    borderRadius: 22,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  recordButtonText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  subtaskList: { borderTopWidth: 1, marginTop: 18, paddingTop: 14 },
  subtaskHeading: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  subtaskRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  subtaskName: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sectionSubtitle: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  slotCount: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  taskList: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 26,
  },
  taskRow: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingRight: 12,
    borderBottomWidth: 1,
  },
  lastRow: { borderBottomWidth: 0 },
  statusStripe: { width: 3, height: 52, marginRight: 12 },
  taskMain: { flex: 1, paddingRight: 6 },
  taskName: { fontSize: 12.5, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
  taskDescription: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    marginTop: 5,
    lineHeight: 13,
  },
  targetBlock: { width: 58 },
  smallLabel: {
    fontSize: 7,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    marginBottom: 4,
  },
  target: { fontSize: 13, fontFamily: "Inter_500Medium" },
  targetEnd: { fontSize: 9, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBlock: { width: 72, alignItems: "flex-start" },
  statusText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: -17,
    marginLeft: 23,
  },
  badge: { fontSize: 8, fontFamily: "Inter_400Regular", marginTop: 5 },
  emptyPlan: {
    alignItems: "center",
    paddingVertical: 34,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 10 },
  emptyText: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 5 },
  metrics: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
    paddingHorizontal: 3,
  },
  metric: { flex: 1 },
  metricLabel: {
    fontSize: 7,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    marginBottom: 7,
  },
  metricValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  metricDivider: { width: 1, height: 34, marginHorizontal: 7 },
  addButton: {
    minHeight: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  addButtonText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 52,
    paddingHorizontal: 4,
  },
  footerText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1.4 },
});
