import Feather from "@expo/vector-icons/Feather";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const TAB_ICONS = {
  index: "home",
  tasks: "check-square",
  progress: "bar-chart-2",
  settings: "settings",
} as const;

export default function TabLayout() {
  const colors = useColors();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () => {
          if (isIOS) {
            return (
              <BlurView
                intensity={100}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            );
          }

          return isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null;
        },
      }}
    >
      {Object.entries(TAB_ICONS).map(([name, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title:
              name === "index"
                ? "Today"
                : `${name[0].toUpperCase()}${name.slice(1)}`,
            tabBarIcon: ({ color }) => (
              <Feather name={icon} size={22} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
