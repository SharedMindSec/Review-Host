import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useCategories } from "@/hooks/useVideos";
import { CATEGORY_COLORS } from "@/constants/api";
import type { Category } from "@/types";

function formatCategoryLabel(value: string) {
  const overrides: Record<string, string> = {
    tv: "TV",
    marriage: "Marriage",
    parenting: "Parenting",
    homemaking: "Homemaking",
  };

  const clean = String(value || "").trim().toLowerCase();

  if (overrides[clean]) return overrides[clean];

  return String(value || "")
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function CategoryCard({ category, onPress }: { category: Category; onPress: () => void }) {
  const colors = useColors();
  const accentColor = CATEGORY_COLORS[category.category] ?? "#7a2f40";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      onPress={onPress}
      testID={`category-card-${formatCategoryLabel(category.category || category.label || "")}`}
    >
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.cardContent}>
        <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>
          {formatCategoryLabel(category.label || category.category || "")}
        </Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {category.videoCount} videos
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function CategoriesScreen() {
  const colors = useColors();
  const { data: categories, isLoading, isError, refetch } = useCategories();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomContentPad = insets.bottom + 130;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={36} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
          Could not load categories
        </Text>
        <Pressable
          style={[styles.retryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          onPress={() => refetch()}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={categories ?? []}
        keyExtractor={(item) => item.category}
        scrollEnabled={(categories ?? []).length > 0}
        contentContainerStyle={{
          padding: 16,
          paddingTop: topPad + 16,
          paddingBottom: bottomContentPad,
          gap: 10,
        }}
        ListHeaderComponent={
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>
            Browse by Category
          </Text>
        }
        renderItem={({ item }) => (
          <CategoryCard
            category={item}
            onPress={() => router.push(`/category/${item.category}`)}
          />
        )}
        ListFooterComponent={<View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="grid-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No categories available
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    overflow: "hidden",
    paddingRight: 14,
  },
  accentBar: {
    width: 5,
    alignSelf: "stretch",
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
    paddingVertical: 14,
    gap: 3,
  },
  label: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  count: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
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
