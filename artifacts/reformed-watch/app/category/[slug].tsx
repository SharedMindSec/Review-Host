import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SkeletonCard, VideoCard } from "@/components/VideoCard";
import { VideoDetailModal } from "@/components/VideoDetailModal";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useColors } from "@/hooks/useColors";
import { useCategoryVideos } from "@/hooks/useVideos";
import { CATEGORY_COLORS } from "@/constants/api";
import type { Video } from "@/types";

function titleCase(value: string) {
  return value
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSaved, toggleFavorite } = useFavorites();
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, refetch } = useCategoryVideos(slug);
  const videos = data?.videos ?? [];
  const accentColor = CATEGORY_COLORS[slug ?? ""] ?? colors.primary;

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
          testID="back-button"
        >
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <View style={[styles.accentDot, { backgroundColor: accentColor }]} />
        <Text
          style={[styles.headerTitle, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {titleCase(slug ?? "")}
        </Text>
      </View>

      <FlatList
        data={isLoading ? ([] as Video[]) : videos}
        keyExtractor={(item) => item.id}
        scrollEnabled={videos.length > 0}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          isLoading ? (
            <View>
              {[0, 1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </View>
          ) : isError ? (
            <View style={styles.center}>
              <Ionicons
                name="cloud-offline-outline"
                size={36}
                color={colors.mutedForeground}
              />
              <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
                Could not load videos
              </Text>
              <Pressable
                style={[
                  styles.retryBtn,
                  { backgroundColor: colors.primary, borderRadius: colors.radius },
                ]}
                onPress={() => refetch()}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : videos.length === 0 ? (
            <View style={styles.center}>
              <Ionicons
                name="film-outline"
                size={36}
                color={colors.mutedForeground}
              />
              <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
                No videos in this category
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <VideoCard
            video={item}
            onPress={setSelectedVideo}
            saved={isSaved(item.id)}
            onToggleSave={toggleFavorite}
          />
        )}
      />

      <VideoDetailModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
        saved={selectedVideo ? isSaved(selectedVideo.id) : false}
        onToggleSave={toggleFavorite}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  accentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 48,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
