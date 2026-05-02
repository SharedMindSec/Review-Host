import { Image } from "expo-image";
import React, { useCallback } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { CATEGORY_COLORS } from "@/constants/api";
import { useColors } from "@/hooks/useColors";
import type { Video } from "@/types";

function titleCase(value: string) {
  return value
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Props = {
  video: Video;
  onPress: (video: Video) => void;
  saved: boolean;
  onToggleSave: (video: Video) => void;
  horizontal?: boolean;
};

export function VideoCard({
  video,
  onPress,
  saved,
  onToggleSave,
  horizontal = false,
}: Props) {
  const colors = useColors();
  const categoryColor = CATEGORY_COLORS[video.category] ?? "#7a2f40";
  const duration = formatDuration(video.durationSeconds);

  const handleSave = useCallback(() => {
    onToggleSave(video);
  }, [onToggleSave, video]);

  return (
    <Pressable
      testID="video-card"
      style={({ pressed }) => [
        styles.card,
        horizontal && styles.cardHorizontal,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: colors.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
      onPress={() => onPress(video)}
    >
      <View
        style={[
          styles.thumbWrapper,
          horizontal && styles.thumbWrapperHorizontal,
          { borderTopLeftRadius: colors.radius, borderTopRightRadius: colors.radius },
        ]}
      >
        <Image
          source={{ uri: video.thumbnailUrl }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
        />
        <View
          style={[styles.categoryBadge, { backgroundColor: categoryColor }]}
        >
          <Text style={styles.categoryBadgeText}>
            {titleCase(video.category)}
          </Text>
        </View>
        {!!duration && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{duration}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text
          style={[styles.title, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {video.title}
        </Text>
        <Text
          style={[styles.channel, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {video.channelTitle}
        </Text>
        <Pressable
          style={styles.saveBtn}
          onPress={handleSave}
          hitSlop={12}
          testID="save-button"
        >
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={18}
            color={saved ? colors.primary : colors.mutedForeground}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}

export function SkeletonCard({ horizontal = false }: { horizontal?: boolean }) {
  const colors = useColors();
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.65,
          duration: 900,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: Platform.OS !== "web",
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <View
      style={[
        styles.card,
        horizontal && styles.cardHorizontal,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: colors.border,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.thumbWrapper,
          horizontal && styles.thumbWrapperHorizontal,
          {
            backgroundColor: colors.muted,
            opacity,
            borderTopLeftRadius: colors.radius,
            borderTopRightRadius: colors.radius,
          },
        ]}
      />
      <View style={[styles.body, { gap: 8 }]}>
        <Animated.View
          style={[
            styles.skeletonTitle,
            { backgroundColor: colors.muted, borderRadius: 4, opacity },
          ]}
        />
        <Animated.View
          style={[
            styles.skeletonSubtitle,
            { backgroundColor: colors.muted, borderRadius: 4, opacity },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHorizontal: {
    width: 270,
    marginBottom: 0,
  },
  thumbWrapper: {
    position: "relative",
    overflow: "hidden",
    aspectRatio: 16 / 9,
  },
  thumbWrapperHorizontal: {
    aspectRatio: 16 / 9,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  categoryBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  durationText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  body: {
    padding: 12,
    paddingBottom: 14,
  },
  title: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
    marginBottom: 4,
    paddingRight: 28,
  },
  channel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  saveBtn: {
    position: "absolute",
    right: 12,
    bottom: 14,
  },
  skeletonTitle: {
    height: 14,
    width: "85%",
  },
  skeletonSubtitle: {
    height: 12,
    width: "55%",
  },
});
