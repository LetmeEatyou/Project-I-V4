import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Subtask = {
  id: string;
  name: string;
  completedDates: string[];
};

export type Task = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  description: string;
  subtasks: Subtask[];
  completedDates: string[];
};

export type Preferences = {
  haptics: boolean;
  reminders: boolean;
  reminderMinutes: number;
};

type TaskContextValue = {
  tasks: Task[];
  preferences: Preferences;
  isReady: boolean;
  addTask: (
    name: string,
    startTime: string,
    endTime: string,
    description: string,
    subtaskNames: string[],
  ) => void;
  updateTask: (
    id: string,
    name: string,
    startTime: string,
    endTime: string,
    description: string,
    subtaskNames: string[],
  ) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string, dateKey: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string, dateKey: string) => void;
  setPreference: <Key extends keyof Preferences>(
    key: Key,
    value: Preferences[Key],
  ) => void;
};

const TASKS_KEY = "istiqamah.tasks.v2";
const PREFERENCES_KEY = "istiqamah.preferences.v2";
export const MIN_REMINDER_MINUTES = 5;
export const MAX_REMINDER_MINUTES = 165;

const normalizeReminderMinutes = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value))
    return MIN_REMINDER_MINUTES;
  const rounded = Math.round(value / 5) * 5;
  return Math.min(
    MAX_REMINDER_MINUTES,
    Math.max(MIN_REMINDER_MINUTES, rounded),
  );
};

const migratePreferences = (raw?: Partial<Preferences>): Preferences => ({
  haptics: raw?.haptics ?? true,
  reminders: raw?.reminders ?? true,
  reminderMinutes: normalizeReminderMinutes(raw?.reminderMinutes),
});

export const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addMinutes = (time: string, amount: number) => {
  const [hours, minutes] = time.split(":").map(Number);
  const total = (((hours * 60 + minutes + amount) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const createSubtasks = (names: string[]): Subtask[] =>
  names
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((name, index) => ({
      id: `subtask-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      completedDates: [],
    }));

const seedTasks = (): Task[] => [
  {
    id: "fajr",
    name: "Fajr Block",
    startTime: "05:00",
    endTime: "06:30",
    description: "Start the day before the noise.",
    subtasks: createSubtasks(["Pray Fajr", "Read Quran"]),
    completedDates: [],
  },
  {
    id: "work",
    name: "Work Hours Discipline",
    startTime: "09:00",
    endTime: "17:00",
    description: "Stay focused. Follow the plan.",
    subtasks: [],
    completedDates: [],
  },
  {
    id: "evening",
    name: "Evening Block",
    startTime: "19:30",
    endTime: "20:30",
    description: "Close the day with intention.",
    subtasks: [],
    completedDates: [],
  },
  {
    id: "night",
    name: "Night Block",
    startTime: "21:30",
    endTime: "22:30",
    description: "Prepare tomorrow before sleep.",
    subtasks: [],
    completedDates: [],
  },
];

const migrateTask = (
  raw: Partial<Task> & {
    target?: string;
    childTasks?: Array<{
      id?: string;
      name: string;
      completedDates?: string[];
    }>;
  },
): Task => {
  const startTime = raw.startTime ?? raw.target ?? "09:00";
  const oldSubtasks = raw.subtasks ?? raw.childTasks ?? [];
  return {
    id: raw.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: raw.name ?? "Untitled block",
    startTime,
    endTime: raw.endTime ?? addMinutes(startTime, 60),
    description: raw.description ?? "Make room for what matters.",
    subtasks: oldSubtasks.slice(0, 5).map((subtask, index) => ({
      id: subtask.id ?? `subtask-${Date.now()}-${index}`,
      name: subtask.name,
      completedDates: subtask.completedDates ?? [],
    })),
    completedDates: raw.completedDates ?? [],
  };
};

const taskWithSubtasks = (
  id: string,
  name: string,
  startTime: string,
  endTime: string,
  description: string,
  subtaskNames: string[],
  existingSubtasks: Subtask[] = [],
): Task => ({
  id,
  name: name.trim(),
  startTime: startTime.trim(),
  endTime: endTime.trim(),
  description: description.trim() || "Make room for what matters.",
  subtasks: subtaskNames
    .map((subtaskName, index) => {
      const previous = existingSubtasks[index];
      return {
        id:
          previous?.id ??
          `subtask-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        name: subtaskName.trim(),
        completedDates: previous?.completedDates ?? [],
      };
    })
    .filter((subtask) => subtask.name)
    .slice(0, 5),
  completedDates: [],
});

const TaskContext = createContext<TaskContextValue | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(() =>
    migratePreferences(),
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(TASKS_KEY),
      AsyncStorage.getItem("istiqamah.tasks.v1"),
      AsyncStorage.getItem(PREFERENCES_KEY),
      AsyncStorage.getItem("istiqamah.preferences.v1"),
    ])
      .then(([storedTasks, oldTasks, storedPreferences, oldPreferences]) => {
        const source = storedTasks ?? oldTasks;
        setTasks(
          source
            ? (JSON.parse(source) as unknown[]).map((task) =>
                migrateTask(
                  task as Partial<Task> & {
                    target?: string;
                    childTasks?: Array<{
                      id?: string;
                      name: string;
                      completedDates?: string[];
                    }>;
                  },
                ),
              )
            : seedTasks(),
        );
        if (storedPreferences)
          setPreferences(
            migratePreferences(
              JSON.parse(storedPreferences) as Partial<Preferences>,
            ),
          );
        else if (oldPreferences)
          setPreferences(
            migratePreferences(
              JSON.parse(oldPreferences) as Partial<Preferences>,
            ),
          );
      })
      .catch(() => setTasks(seedTasks()))
      .finally(() => setIsReady(true));
  }, []);

  useEffect(() => {
    if (isReady)
      AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks)).catch(
        () => undefined,
      );
  }, [isReady, tasks]);

  useEffect(() => {
    if (isReady)
      AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)).catch(
        () => undefined,
      );
  }, [isReady, preferences]);

  const addTask = (
    name: string,
    startTime: string,
    endTime: string,
    description: string,
    subtaskNames: string[],
  ) => {
    setTasks((current) => [
      ...current,
      taskWithSubtasks(
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        startTime,
        endTime,
        description,
        subtaskNames,
      ),
    ]);
  };

  const updateTask = (
    id: string,
    name: string,
    startTime: string,
    endTime: string,
    description: string,
    subtaskNames: string[],
  ) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...taskWithSubtasks(
                id,
                name,
                startTime,
                endTime,
                description,
                subtaskNames,
                task.subtasks,
              ),
              completedDates: task.completedDates,
            }
          : task,
      ),
    );
  };

  const deleteTask = (id: string) =>
    setTasks((current) => current.filter((task) => task.id !== id));

  const toggleTask = (id: string, currentDateKey: string) => {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== id) return task;
        const completed = task.completedDates.includes(currentDateKey);
        return {
          ...task,
          completedDates: completed
            ? task.completedDates.filter((date) => date !== currentDateKey)
            : [...task.completedDates, currentDateKey],
        };
      }),
    );
  };

  const toggleSubtask = (
    taskId: string,
    subtaskId: string,
    currentDateKey: string,
  ) => {
    setTasks((current) =>
      current.map((task) =>
        task.id !== taskId
          ? task
          : {
              ...task,
              subtasks: task.subtasks.map((subtask) => {
                if (subtask.id !== subtaskId) return subtask;
                const completed =
                  subtask.completedDates.includes(currentDateKey);
                return {
                  ...subtask,
                  completedDates: completed
                    ? subtask.completedDates.filter(
                        (date) => date !== currentDateKey,
                      )
                    : [...subtask.completedDates, currentDateKey],
                };
              }),
            },
      ),
    );
  };

  const setPreference: TaskContextValue["setPreference"] = (key, value) =>
    setPreferences((current) => ({ ...current, [key]: value }));

  const value = useMemo(
    () => ({
      tasks,
      preferences,
      isReady,
      addTask,
      updateTask,
      deleteTask,
      toggleTask,
      toggleSubtask,
      setPreference,
    }),
    [tasks, preferences, isReady],
  );
  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) throw new Error("useTasks must be used within a TaskProvider");
  return context;
}
