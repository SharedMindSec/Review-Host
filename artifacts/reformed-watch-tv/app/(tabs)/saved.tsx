import React, { useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VideoCard } from "@/components/VideoCard";
import { VideoDetailModal } from "@/components/VideoDetailModal";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useColors } from "@/hooks/useColors";
import type { Video } from "@/types";

export default function SavedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { favorites, isSaved, toggleFavorite } = useFavorites();
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        scrollEnabled={favorites.length > 0}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: 16,
          paddingTop: topPad + 16,
          paddingBottom: insets.bottom + 90,
        }}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>
              Saved
            </Text>
            {favorites.length > 0 && (
              <Text style={[styles.count, { color: colors.mutedForeground }]}>
                {favorites.length} video{favorites.length !== 1 ? "s" : ""}
              </Text>
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
          <View style={styles.empty}>
            <Ionicons
              name="bookmark-outline"
              size={48}
              color={colors.muted}
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No saved videos yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Bookmark videos to watch them later — they'll appear here even without an internet connection.
            </Text>
          </View>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  count: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
});
