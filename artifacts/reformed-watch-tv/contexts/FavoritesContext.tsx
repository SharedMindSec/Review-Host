import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { FAVORITES_KEY } from "@/constants/api";
import type { Video } from "@/types";

type FavoritesContextType = {
  favorites: Video[];
  isSaved: (id: string) => boolean;
  toggleFavorite: (video: Video) => void;
};

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: [],
  isSaved: () => false,
  toggleFavorite: () => {},
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Video[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY).then((val) => {
      if (val) {
        try {
          setFavorites(JSON.parse(val) as Video[]);
        } catch {
          // ignore malformed storage
        }
      }
    });
  }, []);

  const toggleFavorite = useCallback((video: Video) => {
    setFavorites((prev) => {
      const exists = prev.some((v) => v.id === video.id);
      const next = exists
        ? prev.filter((v) => v.id !== video.id)
        : [video, ...prev];
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isSaved = useCallback(
    (id: string) => favorites.some((v) => v.id === id),
    [favorites]
  );

  return (
    <FavoritesContext.Provider value={{ favorites, isSaved, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
