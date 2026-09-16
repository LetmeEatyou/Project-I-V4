import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { dateKey } from "@/context/task-context";
import type { Task } from "@/context/task-context";
import { blockWindowForDate } from "@/lib/time";

const BLOCK_ALERTS_CHANNEL = "block-alerts-v1";
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

function contentForAlert(
  alert: BlockAlert,
): Notifications.NotificationContentInput {
  const common = {
    sound: "default" as const,
    interruptionLevel: "timeSensitive" as const,
    data: {
      taskId: alert.taskId,
      dateKey: alert.dateKey,
      kind: alert.kind,
    } satisfies BlockNotificationData,
  };

  if (alert.kind === "reminder") {
    return {
      ...common,
      title: `${alert.task.name} starts soon`,
      body: `Your block begins in ${alert.reminderMinutes} minutes. Tap to review it.`,
    };
  }

  if (alert.kind === "start") {
    return {
      ...common,
      title: `${alert.task.name} is starting now`,
      body: `Focus until ${alert.task.endTime}. The block runs whether or not the app is open.`,
    };
  }

  return {
    ...common,
    title: `${alert.task.name} has ended`,
    body: "Tap to record whether you completed this block.",
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

  await configureAndroidChannel();
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
