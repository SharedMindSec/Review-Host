import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { APP_VERSION, CONTACT_URL, PRIVACY_POLICY_URL } from "@/constants/api";
import { useColors } from "@/hooks/useColors";

function InfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  const colors = useColors();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.infoRow,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed && !!onPress ? 0.8 : 1,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Ionicons name={icon as any} size={20} color={colors.primary} />
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        {value && (
          <Text style={[styles.infoValue, { color: colors.foreground }]}>
            {value}
          </Text>
        )}
      </View>
      {!!onPress && (
        <Ionicons
          name="open-outline"
          size={16}
          color={colors.mutedForeground}
        />
      )}
    </Pressable>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function AboutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingBottom: insets.bottom + 90,
        paddingTop: topPad,
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Header */}
      <LinearGradient
        colors={[colors.primary + "22", "transparent"]}
        style={styles.hero}
      >
        <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
          <Text style={styles.logoLetter}>R</Text>
        </View>
        <Text style={[styles.appName, { color: colors.foreground }]}>
          Reformed Watch
        </Text>
        <Text style={[styles.motto, { color: colors.primary }]}>
          SOLA SCRIPTURA · SOLI DEO GLORIA
        </Text>
        <Text style={[styles.version, { color: colors.mutedForeground }]}>
          Version {APP_VERSION}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* About */}
        <Section title="About">
          <Text style={[styles.body_text, { color: colors.mutedForeground }]}>
            Reformed Watch is a curated video library for the Reformed Christian
            community. Browse sermons, lectures, debates, and documentaries from
            faithful ministers and scholars in the Reformed, Presbyterian,
            Covenanter, Puritan, and Calvinist traditions.
          </Text>
          <Text
            style={[
              styles.body_text,
              { color: colors.mutedForeground, marginTop: 8 },
            ]}
          >
            Content is sourced from public platforms and organized into
            theological categories to help believers grow in the grace and
            knowledge of the Lord Jesus Christ.
          </Text>
        </Section>

        {/* Editorial Policy */}
        <Section title="Editorial Policy">
          <Text style={[styles.body_text, { color: colors.mutedForeground }]}>
            We curate content from ministers and scholars who affirm the historic
            Reformed confessions, including the Westminster Standards, the Three
            Forms of Unity, and the London Baptist Confession of 1689. Content
            is selected for theological soundness, pastoral value, and edifying
            quality.
          </Text>
        </Section>

        {/* Content Rating */}
        <Section title="Content Rating">
          <View
            style={[
              styles.ratingCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark"
              size={24}
              color={colors.accent}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.ratingTitle, { color: colors.foreground }]}>
                Suitable for All Ages
              </Text>
              <Text
                style={[styles.ratingSub, { color: colors.mutedForeground }]}
              >
                Biblical and theological educational content. No violence, adult
                content, or inappropriate material.
              </Text>
            </View>
          </View>
        </Section>

        {/* Links */}
        <Section title="Legal & Support">
          <View style={styles.linkList}>
            <InfoRow
              icon="lock-closed-outline"
              label="Privacy Policy"
              value="How we handle your data"
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => undefined)}
            />
            <InfoRow
              icon="mail-outline"
              label="Contact & Support"
              value="Get in touch with us"
              onPress={() => Linking.openURL(CONTACT_URL).catch(() => undefined)}
            />
            <InfoRow
              icon="globe-outline"
              label="Website"
              value="reformed.luls.lol"
              onPress={() => Linking.openURL("https://reformed.luls.lol").catch(() => undefined)}
            />
          </View>
        </Section>

        {/* App info */}
        <Section title="App Information">
          <View style={styles.linkList}>
            <InfoRow icon="code-slash-outline" label="Version" value={APP_VERSION} />
            <InfoRow
              icon="server-outline"
              label="Content Source"
              value="reformed.luls.lol"
            />
            <InfoRow
              icon="logo-youtube"
              label="Video Platform"
              value="YouTube (Privacy-Enhanced Mode)"
            />
          </View>
        </Section>

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          To God alone be the glory.{"\n"}Soli Deo Gloria.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 24,
    gap: 8,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  logoLetter: {
    color: "#fff",
    fontSize: 36,
    fontFamily: "Inter_700Bold",
  },
  appName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  motto: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
  version: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  body: {
    paddingHorizontal: 16,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  body_text: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  ratingCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  ratingTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  ratingSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  linkList: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  infoContent: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    paddingVertical: 8,
  },
});
