import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const rows = [
  {
    title: "Psalter",
    subtitle: "Scottish Metrical Psalter 1650",
    icon: "music",
    route: "/psalter",
  },
  {
    title: "Saved",
    subtitle: "Bookmarked videos",
    icon: "bookmark",
    route: "/saved",
  },
  {
    title: "Notes",
    subtitle: "Private notes and exports",
    icon: "file-text",
    route: "/notes",
  },
  {
    title: "About",
    subtitle: "About Reformed Watch",
    icon: "info",
    route: "/about",
  },
];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0d13" translucent={false} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 22,
            paddingBottom: insets.bottom + 120,
          },
        ]}
      >
        <Text style={styles.kicker}>Reformed Watch</Text>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Tools for watching, reading, and worship.</Text>

        <View style={styles.list}>
          {rows.map((row) => (
            <TouchableOpacity
              key={row.title}
              style={styles.row}
              onPress={() => router.push(row.route as any)}
            >
              <View style={styles.iconBox}>
                <Feather name={row.icon as any} size={21} color="#d77a35" />
              </View>

              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
              </View>

              <Feather name="chevron-right" size={22} color="#8f98ad" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0b0d13",
  },
  content: {
    paddingHorizontal: 18,
  },
  kicker: {
    color: "#d77a35",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  title: {
    color: "#ffffff",
    fontSize: 38,
    fontWeight: "900",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
    marginBottom: 18,
  },
  list: {
    gap: 12,
  },
  row: {
    backgroundColor: "#171b25",
    borderColor: "#252b39",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#241a14",
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 17,
  },
  rowSubtitle: {
    color: "#9ca3af",
    fontWeight: "700",
    marginTop: 3,
    fontSize: 13,
  },
});
