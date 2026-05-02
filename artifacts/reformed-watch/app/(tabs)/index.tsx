import React, { useCallback, useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingScreen } from "@/components/LoadingScreen";
import { SkeletonCard, VideoCard } from "@/components/VideoCard";
import { VideoDetailModal } from "@/components/VideoDetailModal";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useHistory } from "@/contexts/HistoryContext";
import { useColors } from "@/hooks/useColors";
import { useFeaturedVideos, useRecentVideos } from "@/hooks/useVideos";
import type { Video } from "@/types";

export default function HomeScreen() {
  const colors = useColors();
  const { isSaved, toggleFavorite } = useFavorites();
  const { history } = useHistory();
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: featured,
    isLoading: featuredLoading,
    isError: featuredError,
    refetch: refetchFeatured,
  } = useFeaturedVideos();

  const {
    data: recent,
    isLoading: recentLoading,
    isError: recentError,
    refetch: refetchRecent,
  } = useRecentVideos(24);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchFeatured(), refetchRecent()]);
    setRefreshing(false);
  }, [refetchFeatured, refetchRecent]);

  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const noFeaturedData = !(featured as Video[] | undefined)?.length;
  const noRecentData = !(recent as Video[] | undefined)?.length;
  const homeInitialLoading =
    featuredLoading &&
    recentLoading &&
    !refreshing &&
    noFeaturedData &&
    noRecentData;

  if (homeInitialLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingScreen />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={recent ?? []}
        keyExtractor={(item) => item.id}
        scrollEnabled={(recent ?? []).length > 0 || !recentLoading}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 90,
          paddingTop: topPad,
        }}
        ListHeaderComponent={
          <View>
            {/* Brand header */}
            <View style={styles.header}>
              <View style={styles.logoMark}>
                <Text style={[styles.logoR, { color: colors.primary }]}>R</Text>
                <Text style={styles.logoW}>W</Text>
              </View>
              <View style={styles.brandText}>
                <Text style={[styles.brand, { color: colors.foreground }]}>
                  Reformed Watch
                </Text>
                <Text style={[styles.tagline, { color: colors.primary }]}>
                  SOLA SCRIPTURA · SOLI DEO GLORIA
                </Text>
              </View>
            </View>

            {/* Continue Watching */}
            {history.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Continue Watching
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featuredRow}
                >
                  {history.map((entry) => (
                    <VideoCard
                      key={entry.video.id}
                      video={entry.video}
                      onPress={setSelectedVideo}
                      saved={isSaved(entry.video.id)}
                      onToggleSave={toggleFavorite}
                      horizontal
                    />
                  ))}
                </ScrollView>
              </>
            )}

            {/* Featured */}
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Featured
            </Text>
            {featuredLoading ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredRow}
              >
                {[0, 1, 2].map((i) => (
                  <SkeletonCard key={i} horizontal />
                ))}
              </ScrollView>
            ) : featuredError ? (
              <View style={[styles.errorBox, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
                <Ionicons name="cloud-offline-outline" size={28} color={colors.mutedForeground} />
                <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
                  Could not load featured videos
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredRow}
              >
                {(featured ?? []).slice(0, 8).map((v) => (
                  <VideoCard
                    key={v.id}
                    video={v}
                    onPress={setSelectedVideo}
                    saved={isSaved(v.id)}
                    onToggleSave={toggleFavorite}
                    horizontal
                  />
                ))}
              </ScrollView>
            )}

            {/* Latest */}
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Latest Uploads
            </Text>

            {recentLoading &&
              [0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}

            {recentError && (
              <View style={[styles.errorBox, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
                <Ionicons name="cloud-offline-outline" size={28} color={colors.mutedForeground} />
                <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
                  Could not load videos
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <VideoCard
            video={item}
            onPress={setSelectedVideo}
            saved={isSaved(item.id)}
            onToggleSave={toggleFavorite}
          />
        )}
        ListEmptyComponent={
          !recentLoading && !recentError ? (
            <View style={styles.emptyBox}>
              <Ionicons
                name="film-outline"
                size={40}
                color={colors.mutedForeground}
              />
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                No videos found
              </Text>
            </View>
          ) : null
        }
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
    gap: 12,
    paddingTop: 16,
    paddingBottom: 20,
  },
  logoMark: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 0,
  },
  logoR: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  logoW: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: -1,
  },
  brandText: {
    gap: 2,
  },
  brand: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  tagline: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
    marginTop: 4,
  },
  featuredRow: {
    gap: 12,
    paddingBottom: 4,
    marginBottom: 20,
  },
  errorBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
