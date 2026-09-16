import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { dateKey } from "@/context/task-context";
import type { Task } from "@/context/task-context";
import { blockWindowForDate } from "@/lib/time";

const BLOCK_ALERTS_CHANNEL = "block-alerts-v1";
const BLOCK_REMINDER_CATEGORY = "block_reminder";
const BLOCK_START_CATEGORY = "block_start";
const BLOCK_COMPLETE_CATEGORY = "block_complete";
export const COMPLETE_BLOCK_ACTION = "complete_block";
const DAYS_TO_SCHEDULE = 7;
const MAX_SCHEDULED_NOTIFICATIONS = 60;

export type BlockNotificationData = {
  taskId: string;
  dateKey: string;
  kind: "reminder" | "start" | "complete";
};

type BlockAlert = BlockNotificationData & {
  task: Task;
  date: Date;
  reminderMinutes: number;
};

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function requestNotificationPermission() {
  if (Platform.OS === "web") return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function configureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(BLOCK_ALERTS_CHANNEL, {
    name: "Block alarms",
    description: "Time-sensitive reminders for scheduled focus blocks.",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    enableVibrate: true,
    vibrationPattern: [0, 500, 250, 500],
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
  });
}

async function configureNotificationCategories() {
  if (Platform.OS === "web") return;

  const foregroundAction = (identifier: string, buttonTitle: string) => ({
    identifier,
    buttonTitle,
    options: { opensAppToForeground: true },
  });
  const categoryOptions = {
    previewPlaceholder: "Scheduled block update",
    categorySummaryFormat: "%u block updates",
  };

  await Promise.all([
    Notifications.setNotificationCategoryAsync(
      BLOCK_REMINDER_CATEGORY,
      [foregroundAction("review_block", "Review Block")],
      categoryOptions,
    ),
    Notifications.setNotificationCategoryAsync(
      BLOCK_START_CATEGORY,
      [foregroundAction("open_timer", "Open Timer")],
      categoryOptions,
    ),
    Notifications.setNotificationCategoryAsync(
      BLOCK_COMPLETE_CATEGORY,
      [foregroundAction(COMPLETE_BLOCK_ACTION, "Mark Done")],
      categoryOptions,
    ),
  ]);
}

function contentForAlert(
  alert: BlockAlert,
): Notifications.NotificationContentInput {
  const common = {
    sound: "default" as const,
    interruptionLevel: "timeSensitive" as const,
    color: "#2947A5",
    data: {
      taskId: alert.taskId,
      dateKey: alert.dateKey,
      kind: alert.kind,
    } satisfies BlockNotificationData,
  };

  if (alert.kind === "reminder") {
    return {
      ...common,
      title: `Starts in ${alert.reminderMinutes} minutes`,
      subtitle: alert.task.name,
      body: `${alert.task.startTime}–${alert.task.endTime} · ${alert.task.description}`,
      categoryIdentifier: BLOCK_REMINDER_CATEGORY,
    };
  }

  if (alert.kind === "start") {
    return {
      ...common,
      title: "Your block starts now",
      subtitle: alert.task.name,
      body: `Stay with it until ${alert.task.endTime}. ${alert.task.description}`,
      categoryIdentifier: BLOCK_START_CATEGORY,
    };
  }

  return {
    ...common,
    title: "Block finished",
    subtitle: alert.task.name,
    body: "How did it go? Mark it done to keep your progress current.",
    categoryIdentifier: BLOCK_COMPLETE_CATEGORY,
  };
}

function upcomingAlerts(tasks: Task[], reminderMinutes: number, now: Date) {
  const alerts: BlockAlert[] = [];

  for (let dayOffset = 0; dayOffset < DAYS_TO_SCHEDULE; dayOffset += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() + dayOffset);

    for (const task of tasks) {
      const { start, end } = blockWindowForDate(
        day,
        task.startTime,
        task.endTime,
      );
      const taskDateKey = dateKey(start);
      if (task.completedDates.includes(taskDateKey)) continue;
      const reminder = new Date(start.getTime() - reminderMinutes * 60 * 1000);
      const candidates: Array<{ kind: BlockAlert["kind"]; date: Date }> = [
        { kind: "reminder", date: reminder },
        { kind: "start", date: start },
        { kind: "complete", date: end },
      ];

      for (const candidate of candidates) {
        if (candidate.date > now) {
          alerts.push({
            task,
            taskId: task.id,
            dateKey: taskDateKey,
            kind: candidate.kind,
            date: candidate.date,
            reminderMinutes,
          });
        }
      }
    }
  }

  return alerts
    .sort((first, second) => first.date.getTime() - second.date.getTime())
    .slice(0, MAX_SCHEDULED_NOTIFICATIONS);
}

export async function syncUpcomingBlockNotifications(
  tasks: Task[],
  reminderMinutes: number,
  enabled = true,
) {
  if (Platform.OS === "web") return;

  if (!enabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }

  const permitted = await requestNotificationPermission();
  if (!permitted) return;

  await Promise.all([
    configureAndroidChannel(),
    configureNotificationCategories(),
  ]);
  await Notifications.cancelAllScheduledNotificationsAsync();

  const channelId =
    Platform.OS === "android" ? BLOCK_ALERTS_CHANNEL : undefined;
  const alerts = upcomingAlerts(tasks, reminderMinutes, new Date());
  for (const alert of alerts) {
    await Notifications.scheduleNotificationAsync({
      identifier: `block:${alert.taskId}:${alert.dateKey}:${alert.kind}`,
      content: contentForAlert(alert),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: alert.date,
        channelId,
      },
    });
  }
}

export function isBlockNotificationData(
  value: unknown,
): value is BlockNotificationData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<BlockNotificationData>;
  return (
    typeof data.taskId === "string" &&
    typeof data.dateKey === "string" &&
    (data.kind === "reminder" ||
      data.kind === "start" ||
      data.kind === "complete")
  );
}
