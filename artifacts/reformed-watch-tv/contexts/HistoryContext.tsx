import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { HISTORY_KEY, HISTORY_LIMIT } from "@/constants/api";
import type { Video } from "@/types";

export type HistoryEntry = {
  video: Video;
  watchedAt: number;
};

type HistoryContextType = {
  history: HistoryEntry[];
  recordWatched: (video: Video) => void;
  clearHistory: () => void;
  removeEntry: (id: string) => void;
};

const HistoryContext = createContext<HistoryContextType>({
  history: [],
  recordWatched: () => {},
  clearHistory: () => {},
  removeEntry: () => {},
});

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then((val) => {
      if (val) {
        try {
          setHistory(JSON.parse(val) as HistoryEntry[]);
        } catch {
          // ignore malformed storage
        }
      }
    });
  }, []);

  const persist = useCallback((next: HistoryEntry[]) => {
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }, []);

  const recordWatched = useCallback(
    (video: Video) => {
      setHistory((prev) => {
        const filtered = prev.filter((e) => e.video.id !== video.id);
        const next: HistoryEntry[] = [
          { video, watchedAt: Date.now() },
          ...filtered,
        ].slice(0, HISTORY_LIMIT);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    persist([]);
  }, [persist]);

  const removeEntry = useCallback(
    (id: string) => {
      setHistory((prev) => {
        const next = prev.filter((e) => e.video.id !== id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return (
    <HistoryContext.Provider
      value={{ history, recordWatched, clearHistory, removeEntry }}
    >
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  return useContext(HistoryContext);
}
