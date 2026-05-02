import React, { useMemo } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getRandomKjvLoadingVerse } from "@/constants/kjvVerses";

type Props = {
  message?: string;
};

export function LoadingScreen({ message = "Loading videos…" }: Props) {
  const insets = useSafeAreaInsets();
  const verse = useMemo(() => getRandomKjvLoadingVerse(), []);

  return (
    <LinearGradient
      colors={["#140818", "#25102f", "#08090d"]}
      style={[
        styles.root,
        {
          paddingTop: insets.top + 28,
          paddingBottom: insets.bottom + 28,
        },
      ]}
    >
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />

      <View style={styles.logoWrap}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.markBadge}>
          <Text style={styles.markText}>RW</Text>
        </View>
      </View>

      <Text style={styles.appName}>Reformed Watch</Text>
      <Text style={styles.subtitle}>SOLA SCRIPTURA · SOLI DEO GLORIA</Text>

      <View style={styles.verseCard}>
        <Text style={styles.verseText}>“{verse.text}”</Text>
        <Text style={styles.verseRef}>— {verse.ref} KJV</Text>
      </View>

      <View style={styles.loadingRow}>
        <ActivityIndicator color="#ffffff" />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
    overflow: "hidden",
  },
  glowOne: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(119, 54, 150, 0.28)",
    top: -60,
    right: -80,
  },
  glowTwo: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(52, 126, 180, 0.14)",
    bottom: -120,
    left: -100,
  },
  logoWrap: {
    width: 118,
    height: 118,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    marginBottom: 18,
  },
  logo: {
    width: 82,
    height: 82,
  },
  markBadge: {
    position: "absolute",
    right: -10,
    bottom: -10,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4a155d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  markText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 1,
  },
  appName: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 7,
    marginBottom: 26,
    textAlign: "center",
    letterSpacing: 1.4,
  },
  verseCard: {
    width: "100%",
    maxWidth: 430,
    borderRadius: 24,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  verseText: {
    color: "#f6f2f8",
    fontSize: 17,
    lineHeight: 26,
    fontWeight: "700",
    textAlign: "center",
  },
  verseRef: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 14,
    letterSpacing: 0.3,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 26,
  },
  loadingText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    fontWeight: "800",
  },
});
