import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

import { CATEGORY_COLORS } from "@/constants/api";
import { useHistory } from "@/contexts/HistoryContext";
import { useNotes } from "@/contexts/NotesContext";
import { useColors } from "@/hooks/useColors";
import type { Video } from "@/types";
import { isAllowedEmbeddedPlayerUrl, resolvePlayerSource } from "@/utils/videoEmbeds";

function titleCase(value: string) {
  return value
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

type Props = {
  video: Video | null;
  onClose: () => void;
  saved: boolean;
  onToggleSave: (video: Video) => void;
};

export function VideoDetailModal({ video, onClose, saved, onToggleSave }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { recordWatched } = useHistory();
  const { addNote } = useNotes();
  const [playerFailed, setPlayerFailed] = useState(false);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [noteJustSaved, setNoteJustSaved] = useState(false);
  const [draftNoteTitle, setDraftNoteTitle] = useState("");
  const [draftNoteBody, setDraftNoteBody] = useState("");

  const player = useMemo(() => (video ? resolvePlayerSource(video) : null), [video]);

  useEffect(() => {
    if (!video) return;

    activateKeepAwakeAsync("reformed-watch-video").catch(() => undefined);

    return () => {
      deactivateKeepAwake("reformed-watch-video");
    };
  }, [video]);

  useEffect(() => {
    if (video) {
      recordWatched(video);
      setNoteJustSaved(false);
    }
  }, [video, recordWatched]);

  const categoryColor = video
    ? (CATEGORY_COLORS[video.category] ?? "#7a2f40")
    : "#7a2f40";

  const handleSave = useCallback(() => {
    if (!video) return;
    onToggleSave(video);
  }, [video, onToggleSave]);

  const handleClose = useCallback(() => {
    setPlayerFailed(false);
    setPlayerLoading(true);
    onClose();
  }, [onClose]);

  const handleOpenExternal = useCallback(() => {
    const url = player?.originalUrl || video?.watchUrl || video?.embedUrl;
    if (url) {
      Linking.openURL(url).catch(() => undefined);
    }
  }, [player?.originalUrl, video?.embedUrl, video?.watchUrl]);

  const openNoteEditor = useCallback(() => {
    setDraftNoteTitle("");
    setDraftNoteBody("");
    setNoteEditorOpen(true);
  }, []);

  const closeNoteEditor = useCallback(() => {
    setNoteEditorOpen(false);
    setDraftNoteTitle("");
    setDraftNoteBody("");
  }, []);

  const saveLinkedNote = useCallback(() => {
    if (!video) {
      closeNoteEditor();
      return;
    }
    const hasContent = draftNoteTitle.trim() || draftNoteBody.trim();
    if (!hasContent) {
      closeNoteEditor();
      return;
    }
    addNote({
      title: draftNoteTitle,
      body: draftNoteBody,
      videoId: video.id,
      videoTitle: video.title,
    });
    setNoteJustSaved(true);
    closeNoteEditor();
  }, [addNote, closeNoteEditor, draftNoteBody, draftNoteTitle, video]);

  return (
    <Modal
      visible={!!video}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}> 
        <View style={styles.playerContainer}>
          {video && player && !playerFailed ? (
            <WebView
              key={`${video.id}:${player.embedUrl}`}
              source={{ html: player.html, baseUrl: "https://reformed.luls.lol" }}
              style={styles.webview}
              containerStyle={styles.webviewContainer}
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              thirdPartyCookiesEnabled
              setSupportMultipleWindows={false}
              mixedContentMode="never"
              originWhitelist={["https://*", "about:blank", "data:*"]}
              androidLayerType={Platform.OS === "android" ? "hardware" : undefined}
              onLoadStart={() => setPlayerLoading(true)}
              onLoadEnd={() => setPlayerLoading(false)}
              onError={() => {
                setPlayerLoading(false);
                setPlayerFailed(true);
              }}
              onHttpError={(event) => {
                const statusCode = event.nativeEvent.statusCode;
                const failedUrl = event.nativeEvent.url || "";
                if (statusCode >= 400 && failedUrl.includes(player.embedUrl.split("?")[0])) {
                  setPlayerLoading(false);
                  setPlayerFailed(true);
                }
              }}
              onShouldStartLoadWithRequest={(request) => {
                const allowed = isAllowedEmbeddedPlayerUrl(request.url);
                if (!allowed) {
                  Linking.openURL(request.url).catch(() => undefined);
                }
                return allowed;
              }}
            />
          ) : (
            <View style={styles.playerFallback}>
              <Ionicons name="play-circle-outline" size={42} color="#fff" />
              <Text style={styles.playerFallbackTitle}>
                {playerFailed ? "This embedded player failed to load." : "This source cannot be embedded."}
              </Text>
              <Text style={styles.playerFallbackText}>
                The creator or source may block mobile embeds. You can still open it from the original source.
              </Text>
              <Pressable style={styles.openExternalBtn} onPress={handleOpenExternal}>
                <Text style={styles.openExternalText}>
                  Open {player?.provider === "archive" ? "source" : "video"}
                </Text>
              </Pressable>
            </View>
          )}

          {playerLoading && player && !playerFailed && (
            <View style={styles.playerLoadingOverlay} pointerEvents="none">
              <Ionicons name="play-circle" size={36} color="rgba(255,255,255,0.9)" />
              <Text style={styles.playerLoadingText}>Loading player…</Text>
            </View>
          )}

          <LinearGradient
            colors={["rgba(0,0,0,0.45)", "transparent"]}
            style={styles.playerTopGradient}
            pointerEvents="none"
          />
          <TouchableOpacity
            style={[styles.closeBtn, { top: 12 }]}
            onPress={handleClose}
            hitSlop={12}
            testID="close-modal"
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentInner,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {video && (
            <View style={[styles.catBadge, { backgroundColor: categoryColor }]}>
              <Text style={styles.catBadgeText}>{titleCase(video.category)}</Text>
            </View>
          )}

          <Text style={[styles.title, { color: colors.foreground }]}> 
            {video?.title ?? ""}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons name="tv-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}> 
              {video?.channelTitle}
            </Text>
            {!!video?.publishedAt && (
              <>
                <Text style={[styles.metaDot, { color: colors.mutedForeground }]}>·</Text>
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}> 
                  {formatDate(video.publishedAt)}
                </Text>
              </>
            )}
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: saved ? colors.primary : colors.secondary,
                  borderRadius: colors.radius,
                  borderColor: saved ? colors.primary : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={handleSave}
              testID="modal-save-button"
            >
              <Ionicons
                name={saved ? "bookmark" : "bookmark-outline"}
                size={17}
                color={saved ? "#fff" : colors.foreground}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  { color: saved ? "#fff" : colors.foreground },
                ]}
              >
                {saved ? "Saved" : "Save"}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: noteJustSaved
                    ? colors.primary
                    : colors.secondary,
                  borderRadius: colors.radius,
                  borderColor: noteJustSaved ? colors.primary : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={openNoteEditor}
              testID="modal-note-button"
            >
              <Feather
                name={noteJustSaved ? "check" : "edit-3"}
                size={16}
                color={noteJustSaved ? "#fff" : colors.foreground}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  { color: noteJustSaved ? "#fff" : colors.foreground },
                ]}
              >
                {noteJustSaved ? "Note added" : "Note"}
              </Text>
            </Pressable>
          </View>

          {!!video?.description && (
            <Text style={[styles.description, { color: colors.mutedForeground }]}> 
              {video.description}
            </Text>
          )}

          {!!video?.tags?.length && (
            <View style={styles.tagsRow}>
              {video.tags.slice(0, 5).map((tag) => (
                <View
                  key={tag}
                  style={[
                    styles.tag,
                    {
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                      borderRadius: 6,
                    },
                  ]}
                >
                  <Text style={[styles.tagText, { color: colors.mutedForeground }]}> 
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {noteEditorOpen ? (
          <View style={styles.noteSheetBackdrop} pointerEvents="box-none">
            <KeyboardAvoidingView
              style={[
                styles.noteEditorRoot,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  paddingBottom: insets.bottom + 10,
                },
              ]}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View
                style={[
                  styles.noteEditorHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <TouchableOpacity onPress={closeNoteEditor} hitSlop={12}>
                  <Text
                    style={[
                      styles.noteEditorAction,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.noteEditorTitle, { color: colors.foreground }]}>
                  New note
                </Text>
                <TouchableOpacity onPress={saveLinkedNote} hitSlop={12}>
                  <Text
                    style={[styles.noteEditorAction, { color: colors.primary }]}
                  >
                    Save
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.noteEditorBody}>
                <View
                  style={[
                    styles.noteLinkBadge,
                    {
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                      borderRadius: colors.radius,
                    },
                  ]}
                >
                  <Feather
                    name="link-2"
                    size={13}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.noteLinkText,
                      { color: colors.mutedForeground },
                    ]}
                    numberOfLines={1}
                  >
                    Linked to: {video?.title ?? ""}
                  </Text>
                </View>

                <TextInput
                  value={draftNoteTitle}
                  onChangeText={setDraftNoteTitle}
                  placeholder="Title (optional)"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.noteTitleInput, { color: colors.foreground }]}
                  returnKeyType="next"
                />
                <TextInput
                  value={draftNoteBody}
                  onChangeText={setDraftNoteBody}
                  placeholder="Write while the video keeps playing…"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.noteBodyInput, { color: colors.foreground }]}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
              </View>
            </KeyboardAvoidingView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  playerContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    position: "relative",
    overflow: "hidden",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
  webviewContainer: {
    backgroundColor: "#000",
  },
  playerTopGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  playerLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.72)",
    zIndex: 2,
  },
  playerLoadingText: {
    marginTop: 8,
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  playerFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    backgroundColor: "#08090f",
  },
  playerFallbackTitle: {
    marginTop: 8,
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  playerFallbackText: {
    marginTop: 6,
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  openExternalBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  openExternalText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 20,
    gap: 12,
  },
  catBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  catBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  metaDot: {
    fontSize: 13,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1.5,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  noteSheetBackdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 245,
    bottom: 0,
    zIndex: 30,
    paddingHorizontal: 8,
  },
  noteEditorRoot: {
    flex: 1,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 20,
  },
  noteEditorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  noteEditorTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  noteEditorAction: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  noteEditorBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  noteLinkBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  noteLinkText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  noteTitleInput: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    paddingVertical: 8,
  },
  noteBodyInput: {
    flex: 1,
    minHeight: 180,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    paddingTop: 6,
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
