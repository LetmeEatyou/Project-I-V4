import React, { useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { AppState, Platform } from "react-native";
import { TaskProvider, useTasks } from "@/context/task-context";
import { syncBlockLiveActivity } from "@/lib/live-activity";
import { millisecondsUntilNextBlockBoundary } from "@/lib/time";
import {
  COMPLETE_BLOCK_ACTION,
  isBlockNotificationData,
  syncUpcomingBlockNotifications,
} from "@/lib/notifications";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

function SystemEffects() {
  const { tasks, preferences, isReady } = useTasks();
  const notificationSync = useRef<{
    running: boolean;
    mounted: boolean;
    pending: null | {
      tasks: typeof tasks;
      reminderMinutes: number;
      reminders: boolean;
    };
  }>({ running: false, mounted: true, pending: null });

  useEffect(() => {
    const state = notificationSync.current;
    state.mounted = true;
    return () => {
      state.mounted = false;
      state.pending = null;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const state = notificationSync.current;
    state.pending = {
      tasks,
      reminderMinutes: preferences.reminderMinutes,
      reminders: preferences.reminders,
    };

    const runLatest = async () => {
      if (!state.mounted || state.running || !state.pending) return;
      const snapshot = state.pending;
      state.pending = null;
      state.running = true;
      try {
        await syncUpcomingBlockNotifications(
          snapshot.tasks,
          snapshot.reminderMinutes,
          snapshot.reminders,
        );
      } catch {
        // Notification permissions and scheduling failures must not block the app.
      } finally {
        state.running = false;
        if (state.mounted && state.pending) void runLatest();
      }
    };

    const timeout = setTimeout(() => void runLatest(), 250);
    return () => clearTimeout(timeout);
  }, [isReady, preferences.reminderMinutes, preferences.reminders, tasks]);

  useEffect(() => {
    if (!isReady) return;
    let boundaryTimeout: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const sync = async () => {
      await syncBlockLiveActivity(tasks).catch(() => undefined);
      if (stopped) return;
      boundaryTimeout = setTimeout(
        sync,
        millisecondsUntilNextBlockBoundary(tasks),
      );
    };
    const syncNow = () => {
      if (boundaryTimeout) clearTimeout(boundaryTimeout);
      sync();
    };
    syncNow();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") syncNow();
    });
    return () => {
      stopped = true;
      if (boundaryTimeout) clearTimeout(boundaryTimeout);
      subscription.remove();
    };
  }, [isReady, tasks]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const openBlock = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      if (!isBlockNotificationData(data)) return;
      router.replace({
        pathname: "/",
        params: {
          taskId: data.taskId,
          date: data.dateKey,
          action:
            data.kind === "complete" ||
            response.actionIdentifier === COMPLETE_BLOCK_ACTION
              ? "complete"
              : undefined,
        },
      });
    };

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          openBlock(response);
          Notifications.clearLastNotificationResponseAsync().catch(
            () => undefined,
          );
        }
      })
      .catch(() => undefined);
    const subscription =
      Notifications.addNotificationResponseReceivedListener(openBlock);
    return () => subscription.remove();
  }, []);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <TaskProvider>
          <SystemEffects />
          <RootLayoutNav />
        </TaskProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
