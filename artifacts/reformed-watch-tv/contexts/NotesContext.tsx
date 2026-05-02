import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { NOTES_KEY } from "@/constants/api";

export type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  videoId?: string;
  videoTitle?: string;
};

type NotesContextType = {
  notes: Note[];
  addNote: (data: { title: string; body: string; videoId?: string; videoTitle?: string }) => Note;
  updateNote: (id: string, data: { title: string; body: string }) => void;
  deleteNote: (id: string) => void;
};

const NotesContext = createContext<NotesContextType>({
  notes: [],
  addNote: () => ({ id: "", title: "", body: "", createdAt: 0, updatedAt: 0 }),
  updateNote: () => {},
  deleteNote: () => {},
});

function generateId(): string {
  return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(NOTES_KEY).then((val) => {
      if (val) {
        try {
          setNotes(JSON.parse(val) as Note[]);
        } catch {
          // ignore malformed storage
        }
      }
    });
  }, []);

  const persist = useCallback((next: Note[]) => {
    AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next));
  }, []);

  const addNote = useCallback<NotesContextType["addNote"]>(
    ({ title, body, videoId, videoTitle }) => {
      const now = Date.now();
      const note: Note = {
        id: generateId(),
        title: title.trim(),
        body: body.trim(),
        createdAt: now,
        updatedAt: now,
        videoId,
        videoTitle,
      };
      setNotes((prev) => {
        const next = [note, ...prev];
        persist(next);
        return next;
      });
      return note;
    },
    [persist],
  );

  const updateNote = useCallback<NotesContextType["updateNote"]>(
    (id, { title, body }) => {
      setNotes((prev) => {
        const next = prev.map((n) =>
          n.id === id
            ? {
                ...n,
                title: title.trim(),
                body: body.trim(),
                updatedAt: Date.now(),
              }
            : n,
        );
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const deleteNote = useCallback<NotesContextType["deleteNote"]>(
    (id) => {
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return (
    <NotesContext.Provider value={{ notes, addNote, updateNote, deleteNote }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  return useContext(NotesContext);
}
