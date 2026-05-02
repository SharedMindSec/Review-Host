import { Feather, Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNotes, type Note } from "@/contexts/NotesContext";
import { useColors } from "@/hooks/useColors";

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  const ONE_DAY = 24 * 60 * 60 * 1000;

  if (diff < ONE_DAY) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildNotesHtml(notes: Note[]) {
  const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
  const generated = new Date().toLocaleString();

  const body = sorted
    .map((note) => {
      const title = note.title || "Untitled note";
      const video = note.videoTitle
        ? `<div class="linked">Linked video: ${escapeHtml(note.videoTitle)}</div>`
        : "";

      return `
        <section class="note">
          <h2>${escapeHtml(title)}</h2>
          ${video}
          <div class="date">Updated: ${escapeHtml(new Date(note.updatedAt).toLocaleString())}</div>
          <p>${escapeHtml(note.body || "").replace(/\n/g, "<br/>")}</p>
        </section>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #111827;
            padding: 28px;
            line-height: 1.5;
          }
          h1 {
            font-size: 28px;
            margin: 0 0 6px;
          }
          .meta {
            color: #6b7280;
            font-size: 13px;
            margin-bottom: 24px;
          }
          .note {
            border-top: 1px solid #e5e7eb;
            padding-top: 16px;
            margin-top: 18px;
            page-break-inside: avoid;
          }
          h2 {
            font-size: 18px;
            margin: 0 0 6px;
          }
          .linked {
            color: #7c3aed;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .date {
            color: #6b7280;
            font-size: 12px;
            margin-bottom: 10px;
          }
          p {
            white-space: normal;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <h1>Reformed Watch Notes</h1>
        <div class="meta">Generated: ${escapeHtml(generated)}</div>
        ${body || "<p>No notes saved.</p>"}
      </body>
    </html>
  `;
}

export default function NotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notes, addNote, updateNote, deleteNote } = useNotes();

  const [editing, setEditing] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const isOpen = creating || editing !== null;

  useEffect(() => {
    if (creating) {
      setDraftTitle("");
      setDraftBody("");
    } else if (editing) {
      setDraftTitle(editing.title);
      setDraftBody(editing.body);
    }
  }, [creating, editing]);

  const closeEditor = useCallback(() => {
    setCreating(false);
    setEditing(null);
    setDraftTitle("");
    setDraftBody("");
  }, []);

  const handleSave = useCallback(() => {
    const hasContent = draftTitle.trim() || draftBody.trim();

    if (!hasContent) {
      closeEditor();
      return;
    }

    if (editing) {
      updateNote(editing.id, { title: draftTitle, body: draftBody });
    } else {
      addNote({ title: draftTitle, body: draftBody });
    }

    closeEditor();
  }, [addNote, closeEditor, draftBody, draftTitle, editing, updateNote]);

  const handleDelete = useCallback(() => {
    if (!editing) return;

    Alert.alert("Delete note?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteNote(editing.id);
          closeEditor();
        },
      },
    ]);
  }, [closeEditor, deleteNote, editing]);

  const exportPdf = useCallback(async () => {
    if (!notes.length) {
      Alert.alert("No notes", "Create a note before exporting.");
      return;
    }

    try {
      const { uri } = await Print.printToFileAsync({
        html: buildNotesHtml(notes),
      });

      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Export Reformed Watch Notes",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF created", uri);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Export failed", "Could not export notes as PDF.");
    }
  }, [notes]);

  const printNotes = useCallback(async () => {
    if (!notes.length) {
      Alert.alert("No notes", "Create a note before printing.");
      return;
    }

    try {
      await Print.printAsync({
        html: buildNotesHtml(notes),
      });
    } catch (err) {
      console.error(err);
      Alert.alert("Print failed", "Could not open print options.");
    }
  }, [notes]);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt - a.updatedAt),
    [notes],
  );

  const topPad = Platform.OS === "web" ? 24 : insets.top + 12;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Notes</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Private to this device
          </Text>
        </View>

        <TouchableOpacity
          accessibilityLabel="New note"
          onPress={() => setCreating(true)}
          style={[
            styles.newButton,
            { backgroundColor: colors.primary, borderRadius: colors.radius },
          ]}
        >
          <Feather name="plus" size={18} color={colors.primaryForeground} />
          <Text style={[styles.newButtonText, { color: colors.primaryForeground }]}>
            New
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.exportRow}>
        <TouchableOpacity
          onPress={exportPdf}
          style={[
            styles.exportButton,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
        >
          <Feather name="share-2" size={15} color={colors.foreground} />
          <Text style={[styles.exportButtonText, { color: colors.foreground }]}>
            Export PDF
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={printNotes}
          style={[
            styles.exportButton,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
        >
          <Feather name="printer" size={15} color={colors.foreground} />
          <Text style={[styles.exportButtonText, { color: colors.foreground }]}>
            Print
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedNotes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 105,
          paddingTop: 8,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons
              name="document-text-outline"
              size={40}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No notes yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Tap "New" to jot down a thought, sermon point, or scripture reference.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setEditing(item)}
            style={({ pressed }) => [
              styles.noteCard,
              {
                backgroundColor: colors.card,
                borderRadius: colors.radius,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            {item.title ? (
              <Text numberOfLines={1} style={[styles.noteTitle, { color: colors.foreground }]}>
                {item.title}
              </Text>
            ) : null}

            {item.body ? (
              <Text
                numberOfLines={item.title ? 3 : 4}
                style={[
                  styles.noteBody,
                  { color: colors.mutedForeground },
                  !item.title && { marginTop: 0 },
                ]}
              >
                {item.body}
              </Text>
            ) : null}

            {item.videoTitle ? (
              <View style={styles.linkRow}>
                <Feather name="film" size={11} color={colors.primary} style={{ marginRight: 4 }} />
                <Text numberOfLines={1} style={[styles.linkText, { color: colors.primary }]}>
                  {item.videoTitle}
                </Text>
              </View>
            ) : null}

            <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
              {formatTimestamp(item.updatedAt)}
            </Text>
          </Pressable>
        )}
      />

      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEditor}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.editorRoot, { backgroundColor: colors.background }]}
        >
          <View
            style={[
              styles.editorHeader,
              {
                paddingTop: Platform.OS === "ios" ? 16 : insets.top + 12,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity onPress={closeEditor}>
              <Text style={[styles.editorAction, { color: colors.mutedForeground }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <Text style={[styles.editorTitle, { color: colors.foreground }]}>
              {editing ? "Edit note" : "New note"}
            </Text>

            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.editorAction, { color: colors.primary }]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.editorBody}>
            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="Title (optional)"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.titleInput, { color: colors.foreground }]}
              maxLength={120}
              returnKeyType="next"
            />

            <TextInput
              value={draftBody}
              onChangeText={setDraftBody}
              placeholder="Write your note…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
              style={[styles.bodyInput, { color: colors.foreground }]}
            />

            {editing ? (
              <TouchableOpacity
                onPress={handleDelete}
                style={[
                  styles.deleteButton,
                  {
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                  { marginBottom: Math.max(insets.bottom, 0) + 18 },
                ]}
              >
                <Feather name="trash-2" size={16} color="#e4434f" />
                <Text style={[styles.deleteText, { color: "#e4434f" }]}>
                  Delete note
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 6,
  },
  newButtonText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  exportRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  exportButton: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  exportButtonText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  noteCard: { padding: 14, borderWidth: StyleSheet.hairlineWidth },
  noteTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  noteBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  linkRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  linkText: { fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  timestamp: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 10 },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
  },
  editorRoot: { flex: 1 },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  editorTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  editorAction: { fontSize: 15, fontFamily: "Inter_500Medium" },
  editorBody: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  titleInput: { fontSize: 19, fontFamily: "Inter_700Bold", paddingVertical: 8 },
  bodyInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    paddingTop: 6,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
      },
  deleteText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
