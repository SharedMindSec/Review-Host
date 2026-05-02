import type { Video } from "@/types";

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export type PlayerSource = {
  provider: "youtube" | "archive";
  html: string;
  originalUrl: string;
  embedUrl: string;
};

function firstUrl(video: Pick<Video, "embedUrl" | "watchUrl">): string {
  return String(video.embedUrl || video.watchUrl || "").trim();
}

function escapeHtml(value: string): string {
  return value.replace(/[<>&"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      default:
        return char;
    }
  });
}

export function extractYouTubeId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (YOUTUBE_ID_RE.test(value)) return value;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && YOUTUBE_ID_RE.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const queryId = url.searchParams.get("v");
      if (queryId && YOUTUBE_ID_RE.test(queryId)) return queryId;

      const parts = url.pathname.split("/").filter(Boolean);
      const marker = parts.findIndex((part) =>
        ["embed", "shorts", "live"].includes(part)
      );

      if (marker >= 0) {
        const id = parts[marker + 1];
        return id && YOUTUBE_ID_RE.test(id) ? id : null;
      }
    }
  } catch {
    // Fall back to regex parsing below.
  }

  const match = value.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?.*?v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i
  );
  return match?.[1] ?? null;
}

export function extractArchiveIdentifier(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (host !== "archive.org") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    const marker = parts.findIndex((part) => part === "details" || part === "embed");
    if (marker >= 0 && parts[marker + 1]) {
      return decodeURIComponent(parts[marker + 1]);
    }
  } catch {
    const match = value.match(/archive\.org\/(?:details|embed)\/([^/?#]+)/i);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }

  return null;
}

export function buildIframeHtml(src: string, title: string): string {
  const safeTitle = escapeHtml(title || "Video player");
  const safeSrc = escapeHtml(src);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #000;
    }
    .player {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background: #000;
    }
    iframe {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
      background: #000;
    }
  </style>
</head>
<body>
  <main class="player" aria-label="${safeTitle}">
    <iframe
      title="${safeTitle}"
      src="${safeSrc}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
      allowfullscreen
    ></iframe>
  </main>
</body>
</html>`;
}

export function resolvePlayerSource(video: Video): PlayerSource | null {
  const rawUrl = firstUrl(video);
  const source = String(video.sourcePlatform || "").toLowerCase();

  const youtubeId = extractYouTubeId(rawUrl);
  if (youtubeId || source.includes("youtube")) {
    if (!youtubeId) return null;

    const params = new URLSearchParams({
      autoplay: "1",
      playsinline: "1",
      rel: "0",
      modestbranding: "1",
      enablejsapi: "1",
      origin: "https://reformed.luls.lol",
    });

    const embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeId}?${params.toString()}`;
    return {
      provider: "youtube",
      html: buildIframeHtml(embedUrl, video.title),
      originalUrl: video.watchUrl || `https://www.youtube.com/watch?v=${youtubeId}`,
      embedUrl,
    };
  }

  const archiveIdentifier = extractArchiveIdentifier(rawUrl);
  if (archiveIdentifier || source.includes("archive")) {
    if (!archiveIdentifier) return null;

    const embedUrl = `https://archive.org/embed/${encodeURIComponent(archiveIdentifier)}`;
    return {
      provider: "archive",
      html: buildIframeHtml(embedUrl, video.title),
      originalUrl: video.watchUrl || `https://archive.org/details/${archiveIdentifier}`,
      embedUrl,
    };
  }

  return null;
}

export function isAllowedEmbeddedPlayerUrl(url: string): boolean {
  if (!url || url === "about:blank" || url.startsWith("data:")) return true;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;

    const host = parsed.hostname.replace(/^www\./, "");
    const allowedHosts = [
      "youtube.com",
      "youtube-nocookie.com",
      "youtu.be",
      "ytimg.com",
      "googlevideo.com",
      "gstatic.com",
      "google.com",
      "archive.org",
      "reformed.luls.lol",
    ];

    return allowedHosts.some(
      (allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`)
    );
  } catch {
    return false;
  }
}
