import { Ionicons } from "@expo/vector-icons";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { WebView } from "react-native-webview";

import { useFavorites } from "@/contexts/FavoritesContext";
import { useHistory } from "@/contexts/HistoryContext";
import { extractYouTubeId, extractArchiveIdentifier, isAllowedEmbeddedPlayerUrl } from "@/utils/videoEmbeds";
import type { Video } from "@/types";

const { width: W, height: H } = Dimensions.get("window");

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

function buildArchiveHtml(identifier: string): string {
  const src = `https://archive.org/embed/${encodeURIComponent(identifier)}`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <style>*{margin:0;padding:0}html,body{width:100%;height:100%;background:#000;overflow:hidden}
  iframe{position:fixed;inset:0;width:100vw;height:100vh;border:0}</style></head>
  <body><iframe src="${src}" allow="autoplay;fullscreen" allowfullscreen></iframe></body></html>`;
}

type Props = {
  video: Video | null;
  onClose: () => void;
};

function TVBtn({
  icon,
  label,
  onPress,
  active,
  danger,
  primary,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
  primary?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  const bg = focused
    ? "#ff8c00"
    : primary
    ? "#cc0000"
    : active
    ? "#1e4d9b"
    : "#1a1f2e";

  const borderColor = focused ? "#ff8c00" : primary ? "#cc0000" : active ? "#2563eb" : "#2d3550";

  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor },
        focused && styles.btnFocused,
      ]}
    >
      <Ionicons name={icon} size={22} color="#fff" />
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

export function TVVideoDetailModal({ video, onClose }: Props) {
  const { isSaved, toggleFavorite } = useFavorites();
  const { recordWatched } = useHistory();
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true); // start muted — Android allows muted autoplay
  const [playerReady, setPlayerReady] = useState(false);
  const [playerFailed, setPlayerFailed] = useState(false);

  const rawUrl = video ? String(video.embedUrl || video.watchUrl || "") : "";
  const youtubeId = video ? extractYouTubeId(rawUrl) : null;
  const archiveId = !youtubeId && video
    ? extractArchiveIdentifier(rawUrl) ||
      (String(video.sourcePlatform || "").toLowerCase().includes("archive")
        ? rawUrl
        : null)
    : null;

  const saved = video ? isSaved(video.id) : false;

  useEffect(() => {
    if (video) {
      setPlaying(false);
      setMuted(true); // always reset to muted so autoplay works on next video
      setPlayerReady(false);
      setPlayerFailed(false);
      recordWatched(video);
      activateKeepAwakeAsync("reformed-tv").catch(() => undefined);
    } else {
      setPlaying(false);
      deactivateKeepAwake("reformed-tv");
    }
  }, [video, recordWatched]);

  // Auto-start muted as soon as player is ready.
  // Muted autoplay is always allowed on Android — the user can unmute after.
  useEffect(() => {
    if (playerReady && youtubeId) {
      setMuted(true);
      setPlaying(true);
    }
  }, [playerReady, youtubeId]);

  useEffect(() => {
    if (!video) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [video, onClose]);

  const handleToggleSave = useCallback(() => {
    if (video) toggleFavorite(video);
  }, [video, toggleFavorite]);

  const handleOpenExternal = useCallback(() => {
    const url = video?.watchUrl || video?.embedUrl;
    if (url) Linking.openURL(url).catch(() => undefined);
  }, [video]);

  const panelW = Math.round(W * 0.92);
  const playerColW = Math.round(panelW * 0.56);
  const playerH = Math.round(playerColW * (9 / 16));

  if (!video) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.panel, { width: panelW, maxHeight: H * 0.88 }]}>

          {/* ── LEFT: player ── */}
          <View style={[styles.playerCol, { width: playerColW }]}>

            {/* Player area */}
            <View style={[styles.playerBox, { height: playerH }]}>
              {youtubeId && !playerFailed ? (
                <>
                  {/* Thumbnail shown until player signals ready */}
                  {!playerReady && video.thumbnailUrl ? (
                    <Image
                      source={{ uri: video.thumbnailUrl }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                  ) : null}
                  {!playerReady && (
                    <View style={styles.loadingOverlay} pointerEvents="none">
                      <View style={styles.loadingDim} />
                      <Ionicons name="logo-youtube" size={52} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.loadingText}>Loading…</Text>
                    </View>
                  )}
                  <YoutubePlayer
                    height={playerH}
                    width={playerColW}
                    videoId={youtubeId}
                    play={playing}
                    mute={muted}
                    volume={muted ? 0 : 100}
                    onReady={() => setPlayerReady(true)}
                    onChangeState={(state: string) => {
                      if (state === "playing") setPlayerReady(true);
                      if (state === "ended") setPlaying(false);
                    }}
                    onError={() => setPlayerFailed(true)}
                    webViewStyle={styles.ytWebView}
                    webViewProps={{
                      allowsInlineMediaPlayback: true,
                      mediaPlaybackRequiresUserAction: false,
                      javaScriptEnabled: true,
                      domStorageEnabled: true,
                      androidLayerType: "hardware",
                    }}
                    initialPlayerParams={{
                      preventFullScreen: false,
                      controls: true,
                      rel: false,
                      modestbranding: true,
                    }}
                  />
                </>
              ) : archiveId ? (
                <WebView
                  key={`archive:${video.id}`}
                  source={{ html: buildArchiveHtml(archiveId), baseUrl: "https://archive.org" }}
                  style={styles.webview}
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled
                  domStorageEnabled
                  androidLayerType="hardware"
                  allowsFullscreenVideo
                  onShouldStartLoadWithRequest={(req) => {
                    const ok = isAllowedEmbeddedPlayerUrl(req.url);
                    if (!ok) Linking.openURL(req.url).catch(() => undefined);
                    return ok;
                  }}
                />
              ) : (
                <View style={styles.noPlayer}>
                  <Ionicons name="play-circle-outline" size={56} color="#4a5568" />
                  <Text style={styles.noPlayerText}>Cannot embed this video</Text>
                  <TVBtn icon="open-outline" label="Open source" onPress={handleOpenExternal} />
                </View>
              )}
            </View>

            {/* Controls bar (YouTube only) */}
            {youtubeId && (
              <View style={styles.controlsBar}>
                {/* Unmute is the PRIMARY action — video always starts muted */}
                <TVBtn
                  icon={muted ? "volume-mute" : "volume-high"}
                  label={muted ? "Tap to Unmute" : "Mute"}
                  onPress={() => setMuted((m) => !m)}
                  primary={muted}
                />
                <TVBtn
                  icon={playing ? "pause-circle" : "play-circle"}
                  label={playing ? "Pause" : "Play"}
                  onPress={() => setPlaying((p) => !p)}
                  active={playing}
                />
                <TVBtn
                  icon={saved ? "bookmark" : "bookmark-outline"}
                  label={saved ? "Saved" : "Save"}
                  onPress={handleToggleSave}
                  active={saved}
                />
                <TVBtn
                  icon="close-circle-outline"
                  label="Close"
                  onPress={onClose}
                />
              </View>
            )}

            {/* Action buttons (non-YouTube) */}
            {!youtubeId && (
              <View style={styles.controlsBar}>
                <TVBtn
                  icon={saved ? "bookmark" : "bookmark-outline"}
                  label={saved ? "Saved" : "Save"}
                  onPress={handleToggleSave}
                  active={saved}
                />
                <TVBtn
                  icon="open-outline"
                  label="Open source"
                  onPress={handleOpenExternal}
                />
                <TVBtn
                  icon="close-circle-outline"
                  label="Close"
                  onPress={onClose}
                />
              </View>
            )}
          </View>

          {/* ── RIGHT: metadata ── */}
          <ScrollView
            style={styles.metaCol}
            contentContainerStyle={styles.metaInner}
            showsVerticalScrollIndicator={false}
          >
            {video.category ? (
              <Text style={styles.category}>
                {video.category.replace(/-/g, " ").toUpperCase()}
              </Text>
            ) : null}

            <Text style={styles.title}>{video.title}</Text>

            <View style={styles.metaRow}>
              <Ionicons name="tv-outline" size={15} color="#64748b" />
              <Text style={styles.metaText}>{video.channelTitle}</Text>
            </View>

            {video.publishedAt ? (
              <Text style={styles.metaDate}>{formatDate(video.publishedAt)}</Text>
            ) : null}

            {video.description ? (
              <Text style={styles.description}>{video.description}</Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  panel: {
    flexDirection: "row",
    backgroundColor: "#0c0f1a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e2535",
    overflow: "hidden",
  },
  playerCol: {
    backgroundColor: "#000",
    borderRightWidth: 1,
    borderRightColor: "#1e2535",
  },
  playerBox: {
    width: "100%",
    backgroundColor: "#000",
    overflow: "hidden",
    position: "relative",
  },
  ytWebView: {
    opacity: 0.99, // fixes Android hardware layer rendering
    backgroundColor: "#000",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  loadingDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  loadingText: {
    marginTop: 12,
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  noPlayer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  noPlayerText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  controlsBar: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    backgroundColor: "#080a10",
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 2,
  },
  btnFocused: {
    transform: [{ scale: 1.06 }],
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  metaCol: {
    flex: 1,
  },
  metaInner: {
    padding: 30,
    gap: 14,
  },
  category: {
    fontSize: 11,
    fontWeight: "900",
    color: "#ff8c00",
    letterSpacing: 2.5,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 32,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  metaDate: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  description: {
    fontSize: 14,
    color: "#94a3b8",
    lineHeight: 22,
  },
});
