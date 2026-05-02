import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_BASE = "https://bible.helloao.org/api";
const DEFAULT_TRANSLATION = "eng_kja";
const BIBLE_PREF_KEY = "reformed-watch:bible:last-location:v1";
const OFFLINE_META_KEY = "reformed-watch:bible:offline-meta:v1";

type Translation = {
  id: string;
  name?: string;
  englishName?: string;
  shortName?: string;
  language?: string;
  languageName?: string;
  languageEnglishName?: string;
};

type BibleBook = {
  id: string;
  name: string;
  commonName: string;
  numberOfChapters: number;
  firstChapterNumber: number;
  lastChapterNumber: number;
};

type VerseBlock = {
  type: string;
  number?: number;
  content?: any[];
};

type SearchResult = {
  key: string;
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
};

function offlinePath(translation: string) {
  return `${FileSystem.documentDirectory}offline-bible-${translation}.json`;
}

function translationDisplayName(id: string) {
  const map: Record<string, string> = {
    eng_kja: "KJV",
    eng_cpb: "KJV",
    BSB: "BSB",
  };
  return map[id] || id.toUpperCase();
}

function translationHeaderName(id: string) {
  const map: Record<string, string> = {
    eng_kja: "King James Version",
    eng_cpb: "King James Version",
    BSB: "Berean Standard Bible",
  };
  return map[id] || id.toUpperCase();
}

function partToText(part: any): string {
  if (typeof part === "string") return part;
  if (!part || typeof part !== "object") return "";
  if (typeof part.text === "string") return part.text;
  if (typeof part.heading === "string") return part.heading;
  if (part.lineBreak === true) return "\n";
  if (typeof part.noteId === "number") return `[${Number(part.noteId) + 1}]`;
  return "";
}

function contentToText(content: any[] = []) {
  return content.map(partToText).join("").replace(/\s+\n/g, "\n").trim();
}

function getCompleteBooks(data: any): any[] {
  if (Array.isArray(data?.books)) return data.books;
  if (Array.isArray(data?.translation?.books)) return data.translation.books;
  if (Array.isArray(data?.bible?.books)) return data.bible.books;
  if (Array.isArray(data?.content?.books)) return data.content.books;
  return [];
}

function getBookId(book: any): string {
  return book?.id || book?.bookId || book?.osisId || book?.usfm || "";
}

function getBookName(book: any): string {
  return book?.commonName || book?.name || book?.title || getBookId(book);
}

function getChapters(book: any): any[] {
  if (Array.isArray(book?.chapters)) return book.chapters;
  if (Array.isArray(book?.content)) return book.content;
  return [];
}

function getChapterNumber(chapter: any, fallback: number): number {
  return Number(chapter?.number || chapter?.chapterNumber || chapter?.chapter || fallback);
}

function getChapterContent(chapter: any): any[] {
  if (Array.isArray(chapter?.content)) return chapter.content;
  if (Array.isArray(chapter?.chapter?.content)) return chapter.chapter.content;
  return [];
}

function buildSearchIndex(data: any): SearchResult[] {
  const results: SearchResult[] = [];
  const completeBooks = getCompleteBooks(data);

  for (const book of completeBooks) {
    const bookId = getBookId(book);
    const bookName = getBookName(book);
    const chapters = getChapters(book);

    chapters.forEach((chapterObj, chapterIndex) => {
      const chapterNumber = getChapterNumber(chapterObj, chapterIndex + 1);
      const content = getChapterContent(chapterObj);

      for (const block of content) {
        if (block?.type !== "verse") continue;
        const verseNumber = Number(block.number || 0);
        const text = contentToText(block.content || []);
        if (!text) continue;

        results.push({
          key: `${bookId}-${chapterNumber}-${verseNumber}`,
          bookId,
          bookName,
          chapter: chapterNumber,
          verse: verseNumber,
          text,
        });
      }
    });
  }

  return results;
}

function findOfflineChapter(data: any, bookId: string, chapterNumber: number) {
  const completeBooks = getCompleteBooks(data);
  const book = completeBooks.find((b) => getBookId(b) === bookId);
  if (!book) return null;

  const chapters = getChapters(book);
  const chapterObj = chapters.find((c, index) => getChapterNumber(c, index + 1) === chapterNumber);
  if (!chapterObj) return null;

  return {
    book: {
      id: bookId,
      name: book.name || getBookName(book),
      commonName: getBookName(book),
      numberOfChapters: chapters.length,
      firstChapterNumber: 1,
      lastChapterNumber: chapters.length,
    },
    chapter: {
      number: chapterNumber,
      content: getChapterContent(chapterObj),
      footnotes: chapterObj?.footnotes || chapterObj?.chapter?.footnotes || [],
    },
    thisChapterAudioLinks: chapterObj?.thisChapterAudioLinks || {},
  };
}

export default function BibleScreen() {
  const insets = useSafeAreaInsets();
  const [hydrated, setHydrated] = useState(false);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [translation, setTranslation] = useState(DEFAULT_TRANSLATION);
  const [translationSearch, setTranslationSearch] = useState("");

  const [books, setBooks] = useState<BibleBook[]>([]);
  const [bookId, setBookId] = useState("JHN");
  const [chapter, setChapter] = useState(1);
  const [chapterData, setChapterData] = useState<any>(null);

  const [showTranslations, setShowTranslations] = useState(false);
  const [showBooks, setShowBooks] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingChapter, setLoadingChapter] = useState(true);
  const [offlineReady, setOfflineReady] = useState(false);
  const [offlineBusy, setOfflineBusy] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [error, setError] = useState("");

  const selectedBook = useMemo(
    () => books.find((book) => book.id === bookId),
    [books, bookId],
  );

  const chapters = selectedBook
    ? Array.from(
        { length: selectedBook.numberOfChapters },
        (_, i) => selectedBook.firstChapterNumber + i,
      )
    : [];

  const filteredTranslations = useMemo(() => {
    const q = translationSearch.trim().toLowerCase();

    const base = translations.length
      ? translations
      : [
          {
            id: "eng_kja",
            name: "King James Version",
            englishName: "King James Version",
            languageEnglishName: "English",
          },
          {
            id: "BSB",
            name: "Berean Standard Bible",
            englishName: "Berean Standard Bible",
            languageEnglishName: "English",
          },
        ];

    return base
      .filter((t) => {
        const label = `${t.id} ${t.name || ""} ${t.englishName || ""} ${t.shortName || ""} ${t.languageEnglishName || ""}`.toLowerCase();
        const isEnglish =
          label.includes("english") ||
          t.id.startsWith("eng_") ||
          ["eng_kja", "eng_cpb", "BSB"].includes(t.id);

        return isEnglish && (!q || label.includes(q));
      })
      .slice(0, 80);
  }, [translations, translationSearch]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];

    return searchIndex
      .filter((item) => item.text.toLowerCase().includes(q))
      .slice(0, 75);
  }, [searchIndex, searchQuery]);

  const checkOffline = useCallback(async (id = translation) => {
    try {
      const info = await FileSystem.getInfoAsync(offlinePath(id));
      setOfflineReady(info.exists);
      return info.exists;
    } catch {
      setOfflineReady(false);
      return false;
    }
  }, [translation]);

  const loadCompleteBible = useCallback(async (preferOffline = true) => {
    const path = offlinePath(translation);

    if (preferOffline) {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        const raw = await FileSystem.readAsStringAsync(path);
        return JSON.parse(raw);
      }
    }

    const res = await fetch(`${API_BASE}/${translation}/complete.json`);
    if (!res.ok) throw new Error(`Complete Bible failed ${res.status}`);
    return await res.json();
  }, [translation]);

  useEffect(() => {
    async function hydrateLastLocation() {
      try {
        const raw = await AsyncStorage.getItem(BIBLE_PREF_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.translation) setTranslation(saved.translation);
          if (saved.bookId) setBookId(saved.bookId);
          if (saved.chapter) setChapter(Number(saved.chapter) || 1);
        }
      } catch {}

      setHydrated(true);
    }

    hydrateLastLocation();
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    AsyncStorage.setItem(
      BIBLE_PREF_KEY,
      JSON.stringify({ translation, bookId, chapter }),
    ).catch(() => undefined);
  }, [hydrated, translation, bookId, chapter]);

  useEffect(() => {
    checkOffline();
  }, [translation, checkOffline]);

  useEffect(() => {
    async function loadTranslations() {
      try {
        const res = await fetch(`${API_BASE}/available_translations.json`);
        const data = await res.json();
        setTranslations(data.translations || data.availableTranslations || []);
      } catch (err) {
        console.error(err);
      }
    }

    loadTranslations();
  }, []);

  useEffect(() => {
    async function loadBooks() {
      if (!hydrated) return;
      setLoadingBooks(true);
      setError("");

      try {
        const res = await fetch(`${API_BASE}/${translation}/books.json`);
        if (!res.ok) throw new Error(`Books failed ${res.status}`);

        const data = await res.json();
        const apiBooks: BibleBook[] = data.books || [];

        setBooks(apiBooks);

        if (!apiBooks.some((book) => book.id === bookId)) {
          const john = apiBooks.find((book) => book.id === "JHN");
          const first = john || apiBooks[0];
          setBookId(first?.id || "GEN");
          setChapter(first?.firstChapterNumber || 1);
        }
      } catch (err) {
        console.error(err);
        setError("Could not load Bible books.");
      } finally {
        setLoadingBooks(false);
      }
    }

    loadBooks();
  }, [hydrated, translation]);

  useEffect(() => {
    async function loadChapter() {
      if (!hydrated) return;
      setLoadingChapter(true);
      setError("");

      try {
        const hasOffline = await checkOffline();

        if (hasOffline) {
          const complete = await loadCompleteBible(true);
          const offlineChapter = findOfflineChapter(complete, bookId, chapter);
          if (offlineChapter) {
            setChapterData(offlineChapter);
            setLoadingChapter(false);
            return;
          }
        }

        const res = await fetch(`${API_BASE}/${translation}/${bookId}/${chapter}.json`);
        if (!res.ok) throw new Error(`Chapter failed ${res.status}`);

        const data = await res.json();
        setChapterData(data);
      } catch (err) {
        console.error(err);
        setError("Could not load this Bible chapter.");
      } finally {
        setLoadingChapter(false);
      }
    }

    if (bookId && chapter) loadChapter();
  }, [hydrated, translation, bookId, chapter, checkOffline, loadCompleteBible]);

  async function downloadOfflineBible() {
    setOfflineBusy(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/${translation}/complete.json`);
      if (!res.ok) throw new Error(`Offline Bible failed ${res.status}`);

      const text = await res.text();
      await FileSystem.writeAsStringAsync(offlinePath(translation), text, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await AsyncStorage.setItem(
        OFFLINE_META_KEY,
        JSON.stringify({
          translation,
          downloadedAt: Date.now(),
        }),
      );

      setSearchIndex(buildSearchIndex(JSON.parse(text)));
      await checkOffline();
      Alert.alert("Offline Bible saved", `${translationDisplayName(translation)} is now available offline.`);
    } catch (err) {
      console.error(err);
      Alert.alert("Offline Bible failed", "Could not download the offline Bible. Check your connection and try again.");
    } finally {
      setOfflineBusy(false);
    }
  }

  async function clearOfflineBible() {
    setOfflineBusy(true);

    try {
      await FileSystem.deleteAsync(offlinePath(translation), { idempotent: true });
      await AsyncStorage.removeItem(OFFLINE_META_KEY);
      setSearchIndex([]);
      await checkOffline();
      Alert.alert("Offline Bible cleared", "The saved offline Bible was removed from this device.");
    } catch (err) {
      console.error(err);
      Alert.alert("Clear failed", "Could not clear the offline Bible.");
    } finally {
      setOfflineBusy(false);
    }
  }

  async function prepareSearch() {
    setShowSearch(true);

    if (searchIndex.length) return;

    setSearchLoading(true);
    try {
      const complete = await loadCompleteBible(true);
      setSearchIndex(buildSearchIndex(complete));
    } catch (err) {
      console.error(err);
      Alert.alert("Search failed", "Could not prepare Bible search.");
    } finally {
      setSearchLoading(false);
    }
  }

  function goPrevious() {
    if (!selectedBook) return;

    if (chapter > selectedBook.firstChapterNumber) {
      setChapter(chapter - 1);
      return;
    }

    const index = books.findIndex((book) => book.id === selectedBook.id);
    const prevBook = books[index - 1];

    if (prevBook) {
      setBookId(prevBook.id);
      setChapter(prevBook.lastChapterNumber);
    }
  }

  function goNext() {
    if (!selectedBook) return;

    if (chapter < selectedBook.lastChapterNumber) {
      setChapter(chapter + 1);
      return;
    }

    const index = books.findIndex((book) => book.id === selectedBook.id);
    const nextBook = books[index + 1];

    if (nextBook) {
      setBookId(nextBook.id);
      setChapter(nextBook.firstChapterNumber);
    }
  }

  const audioLinks = chapterData?.thisChapterAudioLinks || {};
  const footnotes = chapterData?.chapter?.footnotes || [];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0d13" translucent={false} />
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.kicker}>{translationHeaderName(translation)}</Text>

          <View style={styles.titleRow}>
            <Text style={styles.title}>Bible</Text>

            <TouchableOpacity
              style={styles.topPill}
              onPress={() => setShowTranslations(true)}
            >
              <Text style={styles.topPillText}>{translationDisplayName(translation)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.controls}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.selectGrid}>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowBooks(true)}
              disabled={loadingBooks}
            >
              <Text style={styles.selectorLabel}>Book</Text>
              <Text style={styles.selectorValue} numberOfLines={1}>
                {selectedBook?.commonName || selectedBook?.name || bookId}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowChapters(true)}
              disabled={!selectedBook}
            >
              <Text style={styles.selectorLabel}>Chapter</Text>
              <Text style={styles.selectorValue}>{chapter}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navButton} onPress={goPrevious}>
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>

            <Text style={styles.chapterTitle} numberOfLines={1}>
              {chapterData?.book?.commonName || selectedBook?.commonName || bookId} {chapter}
            </Text>

            <TouchableOpacity style={styles.navButton} onPress={goNext}>
              <Text style={styles.navButtonText}>Next</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.utilityRow}>
            <TouchableOpacity style={styles.utilityButton} onPress={prepareSearch}>
              <Text style={styles.utilityButtonText}>Search Bible</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.utilityButton, offlineReady && styles.utilityButtonReady]}
              onPress={offlineReady ? clearOfflineBible : downloadOfflineBible}
              disabled={offlineBusy}
            >
              <Text style={styles.utilityButtonText}>
                {offlineBusy ? "Working..." : offlineReady ? "Clear Offline" : "Offline Bible"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.offlineStatus}>
            {offlineReady ? "Offline Bible ready" : "Online Bible"}
          </Text>

          {Object.keys(audioLinks).length > 0 ? (
            <View style={styles.audioWrap}>
              {Object.entries(audioLinks).slice(0, 2).map(([reader, url]) => (
                <TouchableOpacity
                  key={reader}
                  style={styles.audioButton}
                  onPress={() => Linking.openURL(String(url))}
                >
                  <Text style={styles.audioButtonText} numberOfLines={1}>
                    Audio: {reader}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        {loadingBooks || loadingChapter ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Loading Bible...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {(chapterData?.chapter?.content || []).map((block: VerseBlock, index: number) => {
              if (block.type === "heading") {
                return (
                  <Text key={index} style={styles.heading}>
                    {contentToText(block.content)}
                  </Text>
                );
              }

              if (block.type === "hebrew_subtitle") {
                return (
                  <Text key={index} style={styles.subtitle}>
                    {contentToText(block.content)}
                  </Text>
                );
              }

              if (block.type === "verse") {
                return (
                  <View key={index} style={styles.verse}>
                    <Text style={styles.verseNumber}>{block.number}</Text>
                    <Text style={styles.verseText}>{contentToText(block.content)}</Text>
                  </View>
                );
              }

              return <View key={index} style={styles.break} />;
            })}

            {footnotes.length > 0 ? (
              <View style={styles.footnotes}>
                <Text style={styles.footnotesTitle}>Footnotes</Text>
                {footnotes.map((note: any, index: number) => (
                  <Text key={note.noteId ?? index} style={styles.footnoteText}>
                    [{Number(note.noteId ?? index) + 1}] {note.text}
                  </Text>
                ))}
              </View>
            ) : null}
          </ScrollView>
        )}

        <Modal visible={showSearch} animationType="slide" onRequestClose={() => setShowSearch(false)}>
          <SafeAreaView style={styles.modal}>
            <Text style={styles.modalTitle}>Search Bible</Text>

            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search KJV verses..."
              placeholderTextColor="#8b93a7"
              style={styles.searchInput}
              autoFocus
            />

            {searchLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Preparing Bible search...</Text>
              </View>
            ) : (
              <ScrollView>
                {searchQuery.trim().length >= 2 && searchResults.length === 0 ? (
                  <Text style={styles.noResults}>No verses found.</Text>
                ) : null}

                {searchResults.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.modalItem}
                    onPress={() => {
                      setBookId(item.bookId);
                      setChapter(item.chapter);
                      setShowSearch(false);
                      setSearchQuery("");
                    }}
                  >
                    <Text style={styles.modalItemTitle}>
                      {item.bookName} {item.chapter}:{item.verse}
                    </Text>
                    <Text style={styles.searchVerseText}>{item.text}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={() => setShowSearch(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Modal>

        <Modal visible={showTranslations} animationType="slide" onRequestClose={() => setShowTranslations(false)}>
          <SafeAreaView style={styles.modal}>
            <Text style={styles.modalTitle}>Choose Translation</Text>

            <TextInput
              value={translationSearch}
              onChangeText={setTranslationSearch}
              placeholder="Search translations..."
              placeholderTextColor="#8b93a7"
              style={styles.searchInput}
            />

            <ScrollView>
              {filteredTranslations.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.modalItem,
                    item.id === translation && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setTranslation(item.id);
                    setShowTranslations(false);
                    setTranslationSearch("");
                    setSearchIndex([]);
                  }}
                >
                  <Text style={styles.modalItemTitle}>
                    {translationDisplayName(item.id)} — {item.englishName || item.name || item.id}
                  </Text>
                  <Text style={styles.modalItemMeta}>
                    {item.languageEnglishName || item.languageName || item.language || "English"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.closeButton} onPress={() => setShowTranslations(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Modal>

        <Modal visible={showBooks} animationType="slide" onRequestClose={() => setShowBooks(false)}>
          <SafeAreaView style={styles.modal}>
            <Text style={styles.modalTitle}>Choose Book</Text>

            <ScrollView>
              {books.map((book) => (
                <TouchableOpacity
                  key={book.id}
                  style={[
                    styles.modalItem,
                    book.id === bookId && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setBookId(book.id);
                    setChapter(book.firstChapterNumber || 1);
                    setShowBooks(false);
                  }}
                >
                  <Text style={styles.modalItemTitle}>{book.commonName || book.name}</Text>
                  <Text style={styles.modalItemMeta}>{book.numberOfChapters} chapters</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.closeButton} onPress={() => setShowBooks(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Modal>

        <Modal visible={showChapters} animationType="slide" onRequestClose={() => setShowChapters(false)}>
          <SafeAreaView style={styles.modal}>
            <Text style={styles.modalTitle}>
              {selectedBook?.commonName || selectedBook?.name || "Book"} Chapters
            </Text>

            <View style={styles.chapterGrid}>
              {chapters.map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.chapterTile,
                    num === chapter && styles.chapterTileActive,
                  ]}
                  onPress={() => {
                    setChapter(num);
                    setShowChapters(false);
                  }}
                >
                  <Text style={styles.chapterTileText}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={() => setShowChapters(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0d13" },
  screen: { flex: 1, backgroundColor: "#0b0d13" },
  header: { paddingHorizontal: 18, paddingTop: 0, paddingBottom: 10 },
  kicker: {
    color: "#d77a35",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: "#ffffff", fontSize: 40, fontWeight: "900" },
  topPill: {
    backgroundColor: "#171b25",
    borderColor: "#252b39",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    minWidth: 94,
    alignItems: "center",
  },
  topPillText: { color: "#ffffff", fontWeight: "900", fontSize: 16 },
  controls: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomColor: "#252b39",
    borderBottomWidth: 1,
  },
  error: { color: "#ffb4b4", marginBottom: 10, fontWeight: "800", fontSize: 15 },
  selectGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  selector: {
    flex: 1,
    backgroundColor: "#171b25",
    borderColor: "#252b39",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 66,
    justifyContent: "center",
  },
  selectorLabel: {
    color: "#8f98ad",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  selectorValue: { color: "#ffffff", fontSize: 20, fontWeight: "900" },
  navRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  navButton: {
    backgroundColor: "#171b25",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 94,
    alignItems: "center",
  },
  navButtonText: { color: "#ffffff", fontWeight: "900", fontSize: 15 },
  chapterTitle: {
    flex: 1,
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 20,
  },
  utilityRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  utilityButton: {
    flex: 1,
    backgroundColor: "#171b25",
    borderColor: "#252b39",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
  },
  utilityButtonReady: { backgroundColor: "#1d2d20", borderColor: "#315c3c" },
  utilityButtonText: { color: "#ffffff", fontWeight: "900", fontSize: 13 },
  offlineStatus: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 7,
  },
  audioWrap: { flexDirection: "row", gap: 10, marginTop: 10 },
  audioButton: {
    flex: 1,
    backgroundColor: "#223047",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  audioButtonText: { color: "#ffffff", fontWeight: "900", fontSize: 13 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#d5dae6", marginTop: 10, fontWeight: "700" },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 125 },
  heading: { color: "#ffffff", fontWeight: "900", fontSize: 22, marginTop: 16, marginBottom: 8 },
  subtitle: { color: "#aab3c5", fontStyle: "italic", fontSize: 15, lineHeight: 23, marginBottom: 8 },
  verse: {
    flexDirection: "row",
    borderBottomColor: "#252b39",
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  verseNumber: { color: "#d77a35", width: 34, fontWeight: "900", fontSize: 14, paddingTop: 4 },
  verseText: { color: "#edf1f7", flex: 1, fontSize: 18, lineHeight: 30 },
  break: { height: 8 },
  footnotes: {
    backgroundColor: "#111722",
    borderColor: "#252b39",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 22,
  },
  footnotesTitle: { color: "#ffffff", fontWeight: "900", fontSize: 18, marginBottom: 10 },
  footnoteText: { color: "#cbd5e1", fontSize: 14, lineHeight: 21, marginBottom: 8 },
  modal: { flex: 1, backgroundColor: "#0b0d13", paddingHorizontal: 18, paddingTop: 16 },
  modalTitle: { color: "#ffffff", fontSize: 28, fontWeight: "900", marginBottom: 14 },
  searchInput: {
    backgroundColor: "#171b25",
    color: "#ffffff",
    borderColor: "#252b39",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  noResults: { color: "#9ca3af", fontWeight: "700", textAlign: "center", marginTop: 24 },
  modalItem: {
    backgroundColor: "#171b25",
    borderColor: "#252b39",
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
  },
  modalItemActive: { borderColor: "#d77a35", backgroundColor: "#241a14" },
  modalItemTitle: { color: "#ffffff", fontWeight: "900", fontSize: 16 },
  modalItemMeta: { color: "#9ca3af", marginTop: 4, fontSize: 13, fontWeight: "700" },
  searchVerseText: { color: "#cbd5e1", marginTop: 8, fontSize: 14, lineHeight: 21 },
  chapterGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chapterTile: {
    width: "18%",
    minHeight: 48,
    backgroundColor: "#171b25",
    borderColor: "#252b39",
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chapterTileActive: { borderColor: "#d77a35", backgroundColor: "#241a14" },
  chapterTileText: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  closeButton: {
    backgroundColor: "#d77a35",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginVertical: 14,
  },
  closeButtonText: { color: "#ffffff", fontWeight: "900", fontSize: 16 },
});
