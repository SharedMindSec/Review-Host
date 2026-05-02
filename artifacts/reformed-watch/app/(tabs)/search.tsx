import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { SkeletonCard, VideoCard } from "@/components/VideoCard";
import { VideoDetailModal } from "@/components/VideoDetailModal";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useColors } from "@/hooks/useColors";
import { useSearchVideos } from "@/hooks/useVideos";
import type { Video } from "@/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSaved, toggleFavorite } = useFavorites();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(input.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [input]);

  const { data, isLoading, isFetching, isError } = useSearchVideos(query);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search input bar */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            marginTop: topPad + 12,
            borderRadius: colors.radius,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          placeholder="Search sermons, topics, speakers..."
          placeholderTextColor={colors.mutedForeground}
          value={input}
          onChangeText={setInput}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          testID="search-input"
        />
        {input.length > 0 && (
          <Pressable onPress={() => { setInput(""); setQuery(""); }} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* Results */}
      {query.length < 2 ? (
        <View style={styles.placeholder}>
          <Ionicons name="search-outline" size={44} color={colors.muted} />
          <Text style={[styles.placeholderTitle, { color: colors.mutedForeground }]}>
            Search Reformed content
          </Text>
          <Text style={[styles.placeholderSub, { color: colors.mutedForeground }]}>
            Find sermons, lectures, debates, and more
          </Text>
        </View>
      ) : isLoading || isFetching ? (
        <FlatList
          data={[0, 1, 2, 3]}
          keyExtractor={(i) => String(i)}
          contentContainerStyle={styles.list}
          renderItem={() => <SkeletonCard />}
        />
      ) : isError ? (
        <View style={styles.placeholder}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.mutedForeground} />
          <Text style={[styles.placeholderTitle, { color: colors.mutedForeground }]}>
            Search failed
          </Text>
          <Text style={[styles.placeholderSub, { color: colors.mutedForeground }]}>
            Check your connection and try again
          </Text>
        </View>
      ) : (data ?? []).length === 0 ? (
        <View style={styles.placeholder}>
          <Ionicons name="document-text-outline" size={44} color={colors.muted} />
          <Text style={[styles.placeholderTitle, { color: colors.mutedForeground }]}>
            No results for "{query}"
          </Text>
          <Text style={[styles.placeholderSub, { color: colors.mutedForeground }]}>
            Try a different search term
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
            {(data ?? []).length} result{(data ?? []).length !== 1 ? "s" : ""} for "{query}"
          </Text>
          <FlatList
            data={data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            scrollEnabled={(data ?? []).length > 0}
            renderItem={({ item }) => (
              <VideoCard
                video={item}
                onPress={setSelectedVideo}
                saved={isSaved(item.id)}
                onToggleSave={toggleFavorite}
              />
            )}
          />
        </>
      )}

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
    paddingHorizontal: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingBottom: 60,
  },
  placeholderTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  placeholderSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  resultCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  list: {
    paddingBottom: 90,
  },
});
