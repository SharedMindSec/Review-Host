import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="categories" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="bible" options={{ href: null }} />
      <Tabs.Screen name="more" options={{ href: null }} />
      <Tabs.Screen name="psalter" options={{ href: null }} />
      <Tabs.Screen name="saved" options={{ href: null }} />
      <Tabs.Screen name="notes" options={{ href: null }} />
      <Tabs.Screen name="about" options={{ href: null }} />
    </Tabs>
  );
}
