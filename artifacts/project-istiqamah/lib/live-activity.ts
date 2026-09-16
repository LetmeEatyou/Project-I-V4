import type { Task } from "@/context/task-context";

export async function syncBlockLiveActivity(
  _tasks: Task[],
  _now = new Date(),
) {}

export async function finishBlockLiveActivity(
  _taskId: string,
  _taskDateKey: string,
) {}
