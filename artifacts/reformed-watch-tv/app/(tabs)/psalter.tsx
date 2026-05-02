import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PSALTER_1650, type PsalterPsalm } from "../../data/psalter1650";

const LAST_PSALTER_KEY = "reformed-watch:psalter:last-psalm:v1";

type SearchHit = {
  key: string;
  psalm: PsalterPsalm;
  verseNumber: number;
  text: string;
};

function psalmLabel(psalm: PsalterPsalm) {
  return psalm.suffix ? `${psalm.number}${psalm.suffix}` : String(psalm.number);
}

export default function PsalterScreen() {
  const insets = useSafeAreaInsets();

  const [selectedId, setSelectedId] = useState("1");
  const [showPicker, setShowPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [largeText, setLargeText] = useState(true);

  const selectedIndex = useMemo(
    () => Math.max(0, PSALTER_1650.findIndex((item) => item.id === selectedId)),
    [selectedId],
  );

  const selectedPsalm = PSALTER_1650[selectedIndex] || PSALTER_1650[0];

  useEffect(() => {
    AsyncStorage.getItem(LAST_PSALTER_KEY)
      .then((saved) => {
        if (saved && PSALTER_1650.some((item) => item.id === saved)) {
          setSelectedId(saved);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(LAST_PSALTER_KEY, selectedId).catch(() => undefined);
  }, [selectedId]);

  const searchHits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const hits: SearchHit[] = [];

    for (const psalm of PSALTER_1650) {
      const header = `${psalm.title} ${psalm.subtitle}`.toLowerCase();

      if (header.includes(q)) {
        hits.push({
          key: `${psalm.id}-title`,
          psalm,
          verseNumber: 0,
          text: psalm.subtitle || psalm.title,
        });
      }

      for (const verse of psalm.verses) {
        if (verse.text.toLowerCase().includes(q)) {
          hits.push({
            key: `${psalm.id}-${verse.number}`,
            psalm,
            verseNumber: verse.number,
            text: verse.text,
          });
        }
      }

      if (hits.length >= 100) break;
    }

    return hits.slice(0, 100);
  }, [query]);

  function previousPsalm() {
    const prev = PSALTER_1650[selectedIndex - 1];
    if (prev) setSelectedId(prev.id);
  }

  function nextPsalm() {
    const next = PSALTER_1650[selectedIndex + 1];
    if (next) setSelectedId(next.id);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0d13" translucent={false} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.kicker}>Scottish Metrical Psalter 1650</Text>

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Psalter</Text>
            <Text style={styles.subtitle}>Psalms of David in Metre</Text>
          </View>

          <TouchableOpacity style={styles.topPill} onPress={() => setLargeText((v) => !v)}>
            <Text style={styles.topPillText}>{largeText ? "Worship" : "Compact"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.controlCard}>
          <TouchableOpacity style={styles.selector} onPress={() => setShowPicker(true)}>
            <Text style={styles.selectorLabel}>Psalm</Text>
            <Text style={styles.selectorValue}>{psalmLabel(selectedPsalm)}</Text>
          </TouchableOpacity>

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navButton} onPress={previousPsalm}>
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>

            <Text style={styles.psalmTitle} numberOfLines={1}>
              {selectedPsalm.title}
            </Text>

            <TouchableOpacity style={styles.navButton} onPress={nextPsalm}>
              <Text style={styles.navButtonText}>Next</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.utilityRow}>
            <TouchableOpacity style={styles.utilityButton} onPress={() => setShowSearch(true)}>
              <Feather name="search" size={15} color="#ffffff" />
              <Text style={styles.utilityButtonText}>Search Psalter</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.utilityButton} onPress={() => setShowPicker(true)}>
              <Feather name="list" size={15} color="#ffffff" />
              <Text style={styles.utilityButtonText}>Choose Psalm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}>
        {selectedPsalm.subtitle ? (
          <Text style={styles.metadata}>{selectedPsalm.subtitle}</Text>
        ) : null}

        {selectedPsalm.verses.map((verse) => (
          <View key={verse.number} style={styles.verse}>
            <Text style={styles.verseNumber}>{verse.number}</Text>
            <Text style={[styles.verseText, largeText && styles.verseTextLarge]}>
              {verse.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showPicker} animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <SafeAreaView style={styles.modal}>
          <Text style={styles.modalTitle}>Choose Psalm</Text>

          <FlatList
            data={PSALTER_1650}
            keyExtractor={(item) => item.id}
            numColumns={4}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.psalmTile,
                  item.id === selectedPsalm.id && styles.psalmTileActive,
                ]}
                onPress={() => {
                  setSelectedId(item.id);
                  setShowPicker(false);
                }}
              >
                <Text style={styles.psalmTileText}>{psalmLabel(item)}</Text>
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity style={styles.closeButton} onPress={() => setShowPicker(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      <Modal visible={showSearch} animationType="slide" onRequestClose={() => setShowSearch(false)}>
        <SafeAreaView style={styles.modal}>
          <Text style={styles.modalTitle}>Search Psalter</Text>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search words or phrase..."
            placeholderTextColor="#8b93a7"
            style={styles.searchInput}
            autoFocus
          />

          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
            {query.trim().length >= 2 && searchHits.length === 0 ? (
              <Text style={styles.noResults}>No matches found.</Text>
            ) : null}

            {searchHits.map((hit) => (
              <TouchableOpacity
                key={hit.key}
                style={styles.resultCard}
                onPress={() => {
                  setSelectedId(hit.psalm.id);
                  setShowSearch(false);
                  setQuery("");
                }}
              >
                <Text style={styles.resultTitle}>
                  {hit.psalm.title}
                  {hit.verseNumber ? `:${hit.verseNumber}` : ""}
                </Text>
                <Text style={styles.resultText}>{hit.text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={() => setShowSearch(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0d13" },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  kicker: {
    color: "#d77a35",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#ffffff",
    fontSize: 40,
    fontWeight: "900",
  },
  subtitle: {
    color: "#9ca3af",
    fontWeight: "700",
    marginTop: 2,
  },
  topPill: {
    backgroundColor: "#171b25",
    borderColor: "#252b39",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 104,
    alignItems: "center",
  },
  topPillText: { color: "#ffffff", fontWeight: "900", fontSize: 14 },
  controls: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomColor: "#252b39",
    borderBottomWidth: 1,
  },
  controlCard: {
    backgroundColor: "#111722",
    borderColor: "#252b39",
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
  },
  selector: {
    backgroundColor: "#171b25",
    borderColor: "#252b39",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  selectorLabel: {
    color: "#8f98ad",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  selectorValue: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  navButton: {
    backgroundColor: "#171b25",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    minWidth: 88,
    alignItems: "center",
  },
  navButtonText: { color: "#ffffff", fontWeight: "900", fontSize: 14 },
  psalmTitle: {
    flex: 1,
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 18,
  },
  utilityRow: {
    flexDirection: "row",
    gap: 10,
  },
  utilityButton: {
    flex: 1,
    backgroundColor: "#223047",
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  utilityButtonText: { color: "#ffffff", fontWeight: "900", fontSize: 13 },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  metadata: {
    color: "#aab3c5",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    marginBottom: 12,
  },
  verse: {
    flexDirection: "row",
    borderBottomColor: "#252b39",
    borderBottomWidth: 1,
    paddingVertical: 13,
  },
  verseNumber: {
    color: "#d77a35",
    width: 36,
    fontWeight: "900",
    fontSize: 14,
    paddingTop: 4,
  },
  verseText: {
    color: "#edf1f7",
    flex: 1,
    fontSize: 18,
    lineHeight: 30,
  },
  verseTextLarge: {
    fontSize: 21,
    lineHeight: 35,
  },
  modal: {
    flex: 1,
    backgroundColor: "#0b0d13",
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 14,
  },
  psalmTile: {
    flex: 1,
    minHeight: 52,
    backgroundColor: "#171b25",
    borderColor: "#252b39",
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    margin: 5,
  },
  psalmTileActive: {
    borderColor: "#d77a35",
    backgroundColor: "#241a14",
  },
  psalmTileText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 16,
  },
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
  noResults: {
    color: "#9ca3af",
    fontWeight: "700",
    textAlign: "center",
    marginTop: 24,
  },
  resultCard: {
    backgroundColor: "#171b25",
    borderColor: "#252b39",
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
  },
  resultTitle: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 16,
  },
  resultText: {
    color: "#cbd5e1",
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
  },
  closeButton: {
    backgroundColor: "#d77a35",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginVertical: 14,
  },
  closeButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 16,
  },
});
