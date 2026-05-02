import { useQuery } from "@tanstack/react-query";

import { API_BASE } from "@/constants/api";
import type { Category, Video } from "@/types";

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export function useFeaturedVideos() {
  return useQuery({
    queryKey: ["videos", "featured"],
    queryFn: () => apiFetch<Video[]>("/api/videos/featured"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecentVideos(limit = 24) {
  return useQuery({
    queryKey: ["videos", "recent", limit],
    queryFn: () => apiFetch<Video[]>(`/api/videos/recent?limit=${limit}`),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<Category[]>("/api/categories"),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCategoryVideos(slug: string | null | undefined) {
  return useQuery({
    queryKey: ["videos", "category", slug],
    queryFn: () =>
      apiFetch<{ videos: Video[] }>(
        `/api/videos?category=${encodeURIComponent(slug!)}&limit=30&offset=0`
      ),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSearchVideos(query: string) {
  return useQuery({
    queryKey: ["videos", "search", query],
    queryFn: async () => {
      const result = await apiFetch<Video[] | { videos: Video[] }>(
        `/api/videos?search=${encodeURIComponent(query)}`
      );
      return Array.isArray(result) ? result : result.videos;
    },
    enabled: query.trim().length >= 2,
    staleTime: 30 * 1000,
  });
}
