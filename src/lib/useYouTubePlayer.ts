"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the YouTube IFrame Player API.
interface YTPlayer {
  cueVideoById(id: string): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
}
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: unknown) => YTPlayer; PlayerState: { PLAYING: number } };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;
function loadApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

/**
 * YouTube player that is cued (ready, not autoplaying), reports the current
 * time and duration, and can jump to a time.
 */
export function useYouTubePlayer(youtubeId: string | null) {
  const hostRef = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const ready = useRef(false);
  const pendingId = useRef<string | null>(youtubeId);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  // Create the player once.
  useEffect(() => {
    let cancelled = false;
    loadApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT) return;
      // Build the iframe ourselves so `playsinline=1` is guaranteed to be in its URL.
      // Without it, iPhone Safari jumps to full screen on play, covering the marks panel.
      const params = new URLSearchParams({
        enablejsapi: "1",
        playsinline: "1",
        rel: "0",
        modestbranding: "1",
        fs: "1",
        origin: window.location.origin,
      });
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube.com/embed/${pendingId.current ?? ""}?${params}`;
      iframe.title = "YouTube video player";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
      iframe.allowFullscreen = true;
      iframe.setAttribute("playsinline", "");
      iframe.setAttribute("webkit-playsinline", "");
      hostRef.current.appendChild(iframe);
      player.current = new window.YT.Player(iframe, {
        events: {
          onReady: () => {
            ready.current = true;
            setDuration(player.current?.getDuration() || 0);
          },
          onStateChange: () => setDuration(player.current?.getDuration() || 0),
        },
      });
    });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
      ready.current = false;
    };
  }, []);

  // Switch videos without rebuilding the player.
  useEffect(() => {
    pendingId.current = youtubeId;
    /* eslint-disable react-hooks/set-state-in-effect -- reset for the new video */
    setCurrent(0);
    setDuration(0);
    /* eslint-enable react-hooks/set-state-in-effect */
    if (ready.current && youtubeId) player.current?.cueVideoById(youtubeId);
  }, [youtubeId]);

  // Track the playhead.
  useEffect(() => {
    const id = setInterval(() => {
      const p = player.current;
      if (!p || !ready.current) return;
      setCurrent(p.getCurrentTime() || 0);
    }, 250);
    return () => clearInterval(id);
  }, []);

  const seek = useCallback((seconds: number) => {
    const p = player.current;
    if (!p || !ready.current) return;
    p.seekTo(seconds, true);
    p.playVideo();
    setCurrent(seconds);
  }, []);

  return { hostRef, time: current, duration, seek };
}
