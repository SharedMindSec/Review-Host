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
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case '"': return "&quot;";
      default: return char;
    }
  });
}

function escapeJs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
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
      const marker = parts.findIndex((p) =>
        ["embed", "shorts", "live"].includes(p)
      );
      if (marker >= 0) {
        const id = parts[marker + 1];
        return id && YOUTUBE_ID_RE.test(id) ? id : null;
      }
    }
  } catch {
    // fall through
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
    const marker = parts.findIndex((p) => p === "details" || p === "embed");
    if (marker >= 0 && parts[marker + 1]) {
      return decodeURIComponent(parts[marker + 1]);
    }
  } catch {
    const match = value.match(/archive\.org\/(?:details|embed)\/([^/?#]+)/i);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }

  return null;
}

/**
 * TV-specific YouTube player HTML.
 *
 * Uses the YouTube IFrame Player JavaScript API instead of a plain <iframe>.
 * The JS API lets us call player.playVideo() in the onReady callback, which
 * bypasses the autoplay blocking and TV-redirect that YouTube applies when it
 * sees the Android TV WebView user-agent or detects an iframe without user
 * interaction. The desktop user-agent set on the WebView component keeps
 * YouTube from redirecting to the TV app entirely.
 */
function buildYouTubeApiHtml(videoId: string, title: string): string {
  const safeId = escapeJs(videoId);
  const safeTitle = escapeHtml(title || "Video");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
  <title>${safeTitle}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:100%;height:100%;background:#000;overflow:hidden}
    #player{position:fixed;inset:0;width:100vw;height:100vh}
    #player iframe{border:0;width:100%;height:100%}
    #err{display:none;position:fixed;inset:0;background:#000;color:#fff;
         font:700 18px/1.5 sans-serif;align-items:center;justify-content:center;
         text-align:center;padding:24px;flex-direction:column;gap:8px}
  </style>
</head>
<body>
  <div id="player"></div>
  <div id="err">Could not load player.</div>
  <script>
  (function(){
    var VIDEO_ID='${safeId}';
    var player;
    var errEl=document.getElementById('err');

    function showErr(){errEl.style.display='flex';}

    var tag=document.createElement('script');
    tag.src='https://www.youtube.com/iframe_api';
    tag.onerror=showErr;
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady=function(){
      try{
        player=new YT.Player('player',{
          videoId:VIDEO_ID,
          playerVars:{
            autoplay:1,
            playsinline:1,
            controls:1,
            rel:0,
            modestbranding:1,
            enablejsapi:1,
            mute:1,
            origin:'https://reformed.luls.lol',
            fs:1
          },
          events:{
            onReady:function(e){
              // Android blocks audible autoplay — start muted so the browser
              // allows it, then unmute after playback is confirmed running.
              e.target.mute();
              e.target.playVideo();
            },
            onStateChange:function(e){
              // YT.PlayerState.PLAYING === 1
              if(e.data===1){
                // Tell React Native the overlay can be dismissed
                if(window.ReactNativeWebView){
                  window.ReactNativeWebView.postMessage('playing');
                }
                // Unmute now that playback is confirmed running
                if(player && player.isMuted && player.isMuted()){
                  player.unMute();
                  player.setVolume(100);
                }
              }
            },
            onError:function(){showErr();}
          }
        });
      }catch(ex){showErr();}
    };

    // Failsafe: API script loaded but never fired, or network slow
    setTimeout(function(){if(!player)showErr();},15000);
  })();
  </script>
</body>
</html>`;
}

function buildArchiveHtml(identifier: string, title: string): string {
  const src = escapeHtml(`https://archive.org/embed/${encodeURIComponent(identifier)}`);
  const safeTitle = escapeHtml(title || "Video");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
  <title>${safeTitle}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:100%;height:100%;background:#000;overflow:hidden}
    iframe{position:fixed;inset:0;width:100vw;height:100vh;border:0;background:#000}
  </style>
</head>
<body>
  <iframe title="${safeTitle}" src="${src}"
    allow="autoplay; fullscreen" allowfullscreen></iframe>
</body>
</html>`;
}

export function resolvePlayerSource(video: Video): PlayerSource | null {
  const rawUrl = firstUrl(video);
  const source = String(video.sourcePlatform || "").toLowerCase();

  const youtubeId = extractYouTubeId(rawUrl);
  if (youtubeId || source.includes("youtube")) {
    if (!youtubeId) return null;
    return {
      provider: "youtube",
      html: buildYouTubeApiHtml(youtubeId, video.title),
      originalUrl: video.watchUrl || `https://www.youtube.com/watch?v=${youtubeId}`,
      embedUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
    };
  }

  const archiveIdentifier = extractArchiveIdentifier(rawUrl);
  if (archiveIdentifier || source.includes("archive")) {
    if (!archiveIdentifier) return null;
    const embedUrl = `https://archive.org/embed/${encodeURIComponent(archiveIdentifier)}`;
    return {
      provider: "archive",
      html: buildArchiveHtml(archiveIdentifier, video.title),
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
      (h) => host === h || host.endsWith(`.${h}`)
    );
  } catch {
    return false;
  }
}
