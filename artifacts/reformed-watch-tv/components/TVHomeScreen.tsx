import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { useFeaturedVideos, useRecentVideos } from "@/hooks/useVideos";
import type { Video } from "@/types";

const { width: W, height: H } = Dimensions.get("window");
const CARD_W = Math.round(W * 0.21);
const CARD_H = Math.round(CARD_W * (9 / 16));
const HERO_H = Math.round(H * 0.40);

interface Props {
  onVideoSelect: (video: Video) => void;
}

// ─── Card ──────────────────────────────────────────────────────────────────

function TVCard({
  video,
  onPress,
  autoFocus,
}: {
  video: Video;
  onPress: (v: Video) => void;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      onPress={() => onPress(video)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      // hasTVPreferredFocus is a valid Android TV prop but not in RN types
      {...(autoFocus ? ({ hasTVPreferredFocus: true } as object) : {})}
      style={[styles.card, focused && styles.cardFocused]}
    >
      {/* Thumbnail */}
      <View style={[styles.cardThumb, { height: CARD_H }]}>
        {video.thumbnailUrl ? (
          <Image
            source={{ uri: video.thumbnailUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : (
          <Ionicons name="film-outline" size={36} color="#334155" />
        )}

        {/* Full-overlay tint + play icon when focused */}
        {focused && (
          <View style={styles.cardFocusOverlay}>
            <Ionicons name="play-circle" size={44} color="#fff" />
          </View>
        )}
      </View>

      {/* Text */}
      <View style={[styles.cardMeta, focused && styles.cardMetaFocused]}>
        <Text
          style={[styles.cardTitle, focused && styles.cardTitleFocused]}
          numberOfLines={2}
        >
          {video.title}
        </Text>
        {video.channelTitle ? (
          <Text style={styles.cardChannel} numberOfLines={1}>
            {video.channelTitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────

function TVHero({
  video,
  onPress,
}: {
  video: Video;
  onPress: (v: Video) => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      onPress={() => onPress(video)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.hero, focused && styles.heroFocused]}
    >
      {video.thumbnailUrl ? (
        <Image
          source={{ uri: video.thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : null}

      <View style={styles.heroScrim} />

      <View style={styles.heroContent}>
        <Text style={styles.heroBadge}>▶  FEATURED</Text>
        <Text style={styles.heroTitle} numberOfLines={2}>{video.title}</Text>
        {video.channelTitle ? (
          <Text style={styles.heroChannel}>{video.channelTitle}</Text>
        ) : null}

        {focused && (
          <View style={styles.heroPlayHint}>
            <Ionicons name="play-circle" size={22} color="#ff8c00" />
            <Text style={styles.heroPlayText}>Press OK to watch</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Row section ───────────────────────────────────────────────────────────

function TVRow({
  title,
  videos,
  loading,
  error,
  onSelect,
  firstCardAutoFocus,
}: {
  title: string;
  videos: Video[];
  loading: boolean;
  error: boolean;
  onSelect: (v: Video) => void;
  firstCardAutoFocus?: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {loading ? (
        <ActivityIndicator color="#ff8c00" size="large" style={styles.rowLoader} />
      ) : error ? (
        <View style={styles.rowError}>
          <Ionicons name="cloud-offline-outline" size={28} color="#475569" />
          <Text style={styles.rowErrorText}>Could not load videos</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {videos.map((v, i) => (
            <TVCard
              key={v.id}
              video={v}
              onPress={onSelect}
              autoFocus={firstCardAutoFocus && i === 0}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────

export function TVHomeScreen({ onVideoSelect }: Props) {
  const { data: featured, isLoading: fLoading, isError: fError } = useFeaturedVideos();
  const { data: recent, isLoading: rLoading, isError: rError } = useRecentVideos(32);

  const featuredList = (featured as Video[] | undefined) ?? [];
  const recentList = (recent as Video[] | undefined) ?? [];
  const hero = featuredList[0];

  const sections = [
    { key: "featured", title: "Featured", videos: featuredList, loading: fLoading, error: fError },
    { key: "recent",   title: "Latest Uploads", videos: recentList, loading: rLoading, error: rError },
  ];

  return (
    <FlatList
      style={styles.root}
      data={sections}
      keyExtractor={(s) => s.key}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logoR}>R</Text>
            <Text style={styles.logoW}>W</Text>
            <View style={styles.headerText}>
              <Text style={styles.appName}>Reformed Watch</Text>
              <Text style={styles.appTagline}>SOLA SCRIPTURA · SOLI DEO GLORIA</Text>
            </View>
          </View>

          {/* Hero */}
          {hero && !fLoading && (
            <TVHero video={hero} onPress={onVideoSelect} />
          )}
        </View>
      }
      renderItem={({ item, index }) => (
        <TVRow
          title={item.title}
          videos={item.videos}
          loading={item.loading}
          error={item.error}
          onSelect={onVideoSelect}
          firstCardAutoFocus={index === 0}
        />
      )}
    />
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#07090f",
  },
  list: {
    paddingBottom: 64,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 52,
    paddingTop: 36,
    paddingBottom: 28,
  },
  logoR: {
    fontSize: 56,
    fontWeight: "900",
    color: "#ff8c00",
    lineHeight: 60,
  },
  logoW: {
    fontSize: 56,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 60,
    marginLeft: -4,
  },
  headerText: {
    marginLeft: 10,
  },
  appName: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
  },
  appTagline: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ff8c00",
    letterSpacing: 2,
    marginTop: 2,
  },

  // Hero
  hero: {
    marginHorizontal: 52,
    marginBottom: 44,
    height: HERO_H,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#111",
    borderWidth: 4,
    borderColor: "transparent",
  },
  heroFocused: {
    borderColor: "#ff8c00",
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 32,
    gap: 8,
  },
  heroBadge: {
    fontSize: 13,
    fontWeight: "900",
    color: "#ff8c00",
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 38,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 46,
  },
  heroChannel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#cbd5e1",
  },
  heroPlayHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  heroPlayText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ff8c00",
  },

  // Row section
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#e2e8f0",
    paddingHorizontal: 52,
    marginBottom: 16,
  },
  row: {
    paddingHorizontal: 52,
    gap: 18,
    // Extra vertical padding so focused/scaled cards aren't clipped
    paddingTop: 8,
    paddingBottom: 16,
  },
  rowLoader: {
    height: CARD_H + 60,
    alignSelf: "flex-start",
    marginLeft: 52,
  },
  rowError: {
    height: CARD_H + 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginLeft: 52,
  },
  rowErrorText: {
    fontSize: 15,
    color: "#475569",
    fontWeight: "600",
  },

  // Card (unfocused)
  card: {
    width: CARD_W,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#111827",
    borderWidth: 4,
    borderColor: "transparent",
  },
  // Card (focused) — thick bright border + scale
  cardFocused: {
    borderColor: "#ff8c00",
    transform: [{ scale: 1.08 }],
  },
  cardThumb: {
    width: "100%",
    backgroundColor: "#1e2535",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  // Full dark tint + play icon overlay when focused
  cardFocusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 140, 0, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardMeta: {
    padding: 10,
    backgroundColor: "#111827",
  },
  cardMetaFocused: {
    backgroundColor: "#1a2235",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#94a3b8",
    lineHeight: 19,
    marginBottom: 4,
  },
  cardTitleFocused: {
    color: "#fff",
  },
  cardChannel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
});
