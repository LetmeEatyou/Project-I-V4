import AsyncStorage from "@react-native-async-storage/async-storage";
import { dateKey } from "@/context/task-context";
import type { Task } from "@/context/task-context";
import { blockWindowForDate } from "@/lib/time";
import BlockLiveActivity from "@/widgets/BlockLiveActivity";
import type { BlockLiveActivityProps } from "@/widgets/BlockLiveActivity";

const ACTIVE_BLOCK_KEY = "istiqamah.live-activity.v1";
const EXPIRED_ACTIVITY_GRACE_MS = 4 * 60 * 60 * 1000;

type StoredActivity = {
  activityId: string;
  taskId: string;
  taskDateKey: string;
  endTimestamp: number;
};

type ActiveBlock = {
  task: Task;
  taskDateKey: string;
  start: Date;
  end: Date;
};

let syncing = false;

function findActiveBlock(tasks: Task[], now: Date): ActiveBlock | undefined {
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const active: ActiveBlock[] = [];
  for (const day of [today, yesterday]) {
    for (const task of tasks) {
      const { start, end } = blockWindowForDate(
        day,
        task.startTime,
        task.endTime,
      );
      if (start <= now && now < end) {
        active.push({ task, taskDateKey: dateKey(start), start, end });
      }
    }
  }

  return active.sort(
    (first, second) => first.start.getTime() - second.start.getTime(),
  )[0];
}

function propsForBlock(block: ActiveBlock): BlockLiveActivityProps {
  const deepLink = `project-istiqamah://?taskId=${encodeURIComponent(block.task.id)}&date=${encodeURIComponent(block.taskDateKey)}&action=complete`;
  return {
    taskId: block.task.id,
    taskName: block.task.name,
    timeLabel: `${block.task.startTime} – ${block.task.endTime}`,
    startTimestamp: block.start.getTime(),
    endTimestamp: block.end.getTime(),
    deepLink,
  };
}

async function loadStoredActivity() {
  const raw = await AsyncStorage.getItem(ACTIVE_BLOCK_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredActivity;
  } catch {
    await AsyncStorage.removeItem(ACTIVE_BLOCK_KEY);
    return null;
  }
}

async function endAllActivities() {
  const instances = BlockLiveActivity.getInstances();
  await Promise.allSettled(
    instances.map((instance) => instance.end("immediate")),
  );
  await AsyncStorage.removeItem(ACTIVE_BLOCK_KEY);
}

export async function syncBlockLiveActivity(tasks: Task[], now = new Date()) {
  if (syncing) return;
  syncing = true;

  try {
    const activeBlock = findActiveBlock(tasks, now);
    const stored = await loadStoredActivity();
    const instances = BlockLiveActivity.getInstances();
    const storedInstance = stored
      ? instances.find((instance) => instance.getId() === stored.activityId)
      : undefined;

    if (stored) {
      const storedTask = tasks.find((task) => task.id === stored.taskId);
      const wasCompleted =
        storedTask?.completedDates.includes(stored.taskDateKey) ?? false;
      const expired =
        now.getTime() > stored.endTimestamp + EXPIRED_ACTIVITY_GRACE_MS;
      if (!storedTask || wasCompleted || expired) {
        await endAllActivities();
      } else if (!storedInstance) {
        await AsyncStorage.removeItem(ACTIVE_BLOCK_KEY);
      }
    }

    if (!activeBlock) {
      if (!stored && instances.length) await endAllActivities();
      return;
    }
    if (activeBlock.task.completedDates.includes(activeBlock.taskDateKey))
      return;

    const current = await loadStoredActivity();
    const currentInstance = current
      ? BlockLiveActivity.getInstances().find(
          (instance) => instance.getId() === current.activityId,
        )
      : undefined;

    if (
      current?.taskId === activeBlock.task.id &&
      current.taskDateKey === activeBlock.taskDateKey &&
      currentInstance
    ) {
      await currentInstance.update(propsForBlock(activeBlock), activeBlock.end);
      return;
    }

    await endAllActivities();
    const props = propsForBlock(activeBlock);
    const instance = BlockLiveActivity.start(
      props,
      props.deepLink,
      activeBlock.end,
    );
    await AsyncStorage.setItem(
      ACTIVE_BLOCK_KEY,
      JSON.stringify({
        activityId: instance.getId(),
        taskId: activeBlock.task.id,
        taskDateKey: activeBlock.taskDateKey,
        endTimestamp: activeBlock.end.getTime(),
      } satisfies StoredActivity),
    );
  } catch {
    // Live Activities can be unavailable in Expo Go, on unsupported iOS versions,
    // or when the user disables them. Notifications remain the fallback.
  } finally {
    syncing = false;
  }
}

export async function finishBlockLiveActivity(
  taskId: string,
  taskDateKey: string,
) {
  try {
    const stored = await loadStoredActivity();
    if (
      !stored ||
      (stored.taskId === taskId && stored.taskDateKey === taskDateKey)
    ) {
      await endAllActivities();
    }
  } catch {
    // Completion recording must never fail because ActivityKit is unavailable.
  }
}
