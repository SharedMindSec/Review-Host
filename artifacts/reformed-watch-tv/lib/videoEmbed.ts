import type { Video } from "@/types";

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;

function firstUrl(video: Video): string {
  return String(video.embedUrl || video.watchUrl || "").trim();
}

export function extractYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (YOUTUBE_ID.test(raw)) return raw;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && YOUTUBE_ID.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const watchId = url.searchParams.get("v");
      if (watchId && YOUTUBE_ID.test(watchId)) return watchId;

      const parts = url.pathname.split("/").filter(Boolean);
      for (const marker of ["embed", "shorts", "live"]) {
        const index = parts.indexOf(marker);
        if (index >= 0 && parts[index + 1] && YOUTUBE_ID.test(parts[index + 1])) {
          return parts[index + 1];
        }
      }
    }
  } catch {
    // Regex fallback below.
  }

  const fallback = raw.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?.*?v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/
  );

  return fallback?.[1] || null;
}

export function extractArchiveIdentifier(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");
    if (host !== "archive.org") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    const markerIndex = parts.findIndex((p) => p === "details" || p === "embed");
    if (markerIndex >= 0 && parts[markerIndex + 1]) {
      return decodeURIComponent(parts[markerIndex + 1]);
    }
  } catch {
    const match = raw.match(/archive\.org\/(?:details|embed)\/([^/?#]+)/i);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }

  return null;
}

export function buildVideoEmbedUrl(video: Video): string {
  const raw = firstUrl(video);
  const platform = String(video.sourcePlatform || "").toLowerCase();

  const youtubeId = extractYouTubeId(raw);
  if (platform.includes("youtube") || youtubeId) {
    if (!youtubeId) return raw;

    const params = new URLSearchParams({
      autoplay: "1",
      rel: "0",
      playsinline: "1",
      modestbranding: "1",
      enablejsapi: "1",
    });

    return `https://www.youtube-nocookie.com/embed/${youtubeId}?${params.toString()}`;
  }

  const archiveId = extractArchiveIdentifier(raw);
  if (platform.includes("archive") || archiveId) {
    return archiveId ? `https://archive.org/embed/${encodeURIComponent(archiveId)}` : raw;
  }

  return raw;
}

export function buildEmbedHtml(video: Video): string {
  const url = buildVideoEmbedUrl(video);
  const safeTitle = video.title.replace(/[<>"&]/g, (char) => {
    const map: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "&": "&amp;",
    };
    return map[char] || char;
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;background:#000;overflow:hidden;}
.player{position:fixed;inset:0;width:100vw;height:100vh;background:#000;}
iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#000;}
</style>
</head>
<body>
<main class="player" aria-label="${safeTitle}">
<iframe
  title="${safeTitle}"
  src="${url}"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
  allowfullscreen
></iframe>
</main>
</body>
</html>`;
}
