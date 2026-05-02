import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const isDark = colorScheme === "dark";
  const isWeb = Platform.OS === "web";

  const bottomPad = isWeb ? 12 : insets.bottom > 0 ? insets.bottom + 6 : 6;
  const barHeight = isWeb ? 78 : 62 + bottomPad;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: barHeight,
          paddingTop: 6,
          paddingBottom: bottomPad,
        },
        tabBarBackground: () => (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? "rgba(15,16,20,0.98)"
                  : colors.background,
              },
            ]}
          />
        ),
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 10,
          marginTop: -2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <Feather name="home" size={20} color={color} /> }} />
      <Tabs.Screen name="categories" options={{ title: "Browse", tabBarIcon: ({ color }) => <Feather name="grid" size={20} color={color} /> }} />
      <Tabs.Screen name="search" options={{ title: "Search", tabBarIcon: ({ color }) => <Feather name="search" size={20} color={color} /> }} />
      <Tabs.Screen name="bible" options={{ title: "Bible", tabBarIcon: ({ color }) => <Feather name="book-open" size={20} color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: ({ color }) => <Feather name="menu" size={21} color={color} /> }} />

      <Tabs.Screen name="psalter" options={{ href: null }} />
      <Tabs.Screen name="saved" options={{ href: null }} />
      <Tabs.Screen name="notes" options={{ href: null }} />
      <Tabs.Screen name="about" options={{ href: null }} />
    </Tabs>
  );
}
