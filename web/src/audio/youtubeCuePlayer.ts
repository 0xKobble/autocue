/**
 * Official YouTube IFrame Player API — cue-only deck audio.
 * Never decodes DRM streams; Play/Pause/volume only via embed.
 */
import type { DeckId } from "../types/models";
import type { Track } from "../types/models";

const API_SRC = "https://www.youtube.com/iframe_api";

interface YtPlayer {
  cueVideoById: (videoId: string | { videoId: string; startSeconds?: number }) => void;
  loadVideoById: (videoId: string | { videoId: string; startSeconds?: number }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (vol: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          width?: number | string;
          height?: number | string;
          videoId?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: { target: YtPlayer }) => void;
            onStateChange?: (e: { data: number; target: YtPlayer }) => void;
            onError?: (e: { data: number; target: YtPlayer }) => void;
          };
        }
      ) => YtPlayer;
      PlayerState?: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const players: Partial<Record<DeckId, YtPlayer>> = {};
const readyFlags: Partial<Record<DeckId, boolean>> = {};
const videoIds: Partial<Record<DeckId, string>> = {};
const readyWaiters: Partial<Record<DeckId, Array<() => void>>> = {};

type CueErrorHandler = (id: DeckId, message: string) => void;
type CueStateHandler = (id: DeckId, playing: boolean) => void;

let errorHandler: CueErrorHandler | null = null;
let stateHandler: CueStateHandler | null = null;

let apiLoading: Promise<void> | null = null;

export function setYoutubeCueErrorHandler(handler: CueErrorHandler | null) {
  errorHandler = handler;
}

export function setYoutubeCueStateHandler(handler: CueStateHandler | null) {
  stateHandler = handler;
}

/** Prefer explicit field; fall back to id `yt-real-<videoId>`. */
export function youtubeVideoIdOf(track: Track | null | undefined): string | null {
  if (!track || track.source !== "youtube") return null;
  if (track.youtubeVideoId?.trim()) return track.youtubeVideoId.trim();
  const m = /^yt-real-([A-Za-z0-9_-]{6,})$/.exec(track.id);
  return m?.[1] ?? null;
}

export function loadYoutubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoading) return apiLoading;
  apiLoading = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        prev?.();
      } catch {
        /* */
      }
      resolve();
    };
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${API_SRC}"]`);
    if (existing) {
      if (window.YT?.Player) resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = API_SRC;
    s.async = true;
    s.onerror = () => {
      apiLoading = null;
      reject(new Error("Failed to load YouTube IFrame API"));
    };
    document.head.appendChild(s);
  });
  return apiLoading;
}

function waitReady(id: DeckId): Promise<void> {
  if (readyFlags[id] && players[id]) return Promise.resolve();
  return new Promise((resolve) => {
    (readyWaiters[id] ??= []).push(resolve);
  });
}

function flushReady(id: DeckId) {
  readyFlags[id] = true;
  const waiters = readyWaiters[id] ?? [];
  readyWaiters[id] = [];
  for (const w of waiters) w();
}

function ensureHostElement(id: DeckId): HTMLElement {
  let layer = document.getElementById("yt-cue-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "yt-cue-layer";
    layer.className = "yt-cue-layer";
    layer.setAttribute("aria-label", "YouTube cue players");
    document.body.appendChild(layer);
  }
  let slot = document.getElementById(`yt-cue-slot-${id}`);
  if (!slot) {
    slot = document.createElement("div");
    slot.id = `yt-cue-slot-${id}`;
    slot.className = "yt-cue-slot";
    slot.dataset.deck = id;
    slot.dataset.active = "false";
    const label = document.createElement("span");
    label.className = "yt-cue-label";
    label.textContent = `Deck ${id}`;
    const host = document.createElement("div");
    host.id = `yt-cue-host-${id}`;
    host.className = "yt-cue-host";
    slot.appendChild(label);
    slot.appendChild(host);
    layer.appendChild(slot);
  }
  const host = document.getElementById(`yt-cue-host-${id}`);
  if (!host) throw new Error(`Missing YouTube host for deck ${id}`);
  return host;
}

function setSlotActive(id: DeckId, active: boolean) {
  const slot = document.getElementById(`yt-cue-slot-${id}`);
  if (slot) slot.dataset.active = active ? "true" : "false";
}

function errorMessage(code: number): string {
  switch (code) {
    case 2:
      return "Invalid YouTube video id";
    case 5:
      return "YouTube HTML5 player error";
    case 100:
      return "Video not found / private";
    case 101:
    case 150:
      return "Embedding disabled for this video — try another or Local file";
    default:
      return `YouTube embed error (${code})`;
  }
}

async function ensurePlayer(id: DeckId): Promise<YtPlayer> {
  await loadYoutubeIframeApi();
  if (players[id] && readyFlags[id]) return players[id]!;
  if (players[id]) {
    await waitReady(id);
    return players[id]!;
  }
  if (!window.YT?.Player) {
    throw new Error("YouTube IFrame API unavailable");
  }
  const host = ensureHostElement(id);
  host.innerHTML = "";
  await new Promise<void>((resolve, reject) => {
    try {
      const player = new window.YT!.Player(host, {
        width: 160,
        height: 90,
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            players[id] = e.target;
            flushReady(id);
            resolve();
          },
          onStateChange: (e) => {
            const ended = window.YT?.PlayerState?.ENDED ?? 0;
            const playing = window.YT?.PlayerState?.PLAYING ?? 1;
            const paused = window.YT?.PlayerState?.PAUSED ?? 2;
            if (e.data === ended || e.data === paused) {
              stateHandler?.(id, false);
            } else if (e.data === playing) {
              stateHandler?.(id, true);
            }
          },
          onError: (e) => {
            errorHandler?.(id, errorMessage(e.data));
            stateHandler?.(id, false);
          },
        },
      });
      players[id] = player;
      // onReady also resolves; timeout safety
      window.setTimeout(() => {
        if (!readyFlags[id]) {
          // Player may already be usable
          if (players[id]) {
            flushReady(id);
            resolve();
          } else {
            reject(new Error("YouTube player timed out"));
          }
        }
      }, 8000);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
  return players[id]!;
}

export async function loadYoutubeCue(
  id: DeckId,
  videoId: string,
  opts?: { autoplay?: boolean; startSeconds?: number }
): Promise<void> {
  const player = await ensurePlayer(id);
  videoIds[id] = videoId;
  setSlotActive(id, true);
  const payload = { videoId, startSeconds: opts?.startSeconds ?? 0 };
  if (opts?.autoplay) {
    player.loadVideoById(payload);
  } else {
    player.cueVideoById(payload);
  }
}

export async function playYoutubeCue(id: DeckId): Promise<void> {
  const player = await ensurePlayer(id);
  try {
    player.unMute();
  } catch {
    /* */
  }
  player.playVideo();
}

export function pauseYoutubeCue(id: DeckId): void {
  try {
    players[id]?.pauseVideo();
  } catch {
    /* */
  }
}

export function stopYoutubeCue(id: DeckId): void {
  try {
    players[id]?.stopVideo();
  } catch {
    /* */
  }
}

/** Volume 0–1 → YouTube 0–100. */
export function setYoutubeCueVolume(id: DeckId, vol01: number): void {
  const p = players[id];
  if (!p) return;
  const v = Math.round(Math.max(0, Math.min(1, vol01)) * 100);
  try {
    p.setVolume(v);
    if (v <= 0) p.mute();
    else p.unMute();
  } catch {
    /* */
  }
}

export function seekYoutubeCue(id: DeckId, seconds: number): void {
  try {
    players[id]?.seekTo(Math.max(0, seconds), true);
  } catch {
    /* */
  }
}

export function getYoutubeCuePosition01(id: DeckId): number | null {
  const p = players[id];
  if (!p || typeof p.getDuration !== "function") return null;
  try {
    const dur = p.getDuration();
    if (!dur || !Number.isFinite(dur) || dur <= 0) return null;
    const t = p.getCurrentTime();
    return Math.min(0.999, Math.max(0, t / dur));
  } catch {
    return null;
  }
}

export function getYoutubeCueDurationSec(id: DeckId): number | null {
  const p = players[id];
  if (!p) return null;
  try {
    const dur = p.getDuration();
    return dur && Number.isFinite(dur) && dur > 0 ? dur : null;
  } catch {
    return null;
  }
}

export function clearYoutubeCue(id: DeckId): void {
  videoIds[id] = undefined;
  setSlotActive(id, false);
  try {
    players[id]?.stopVideo();
  } catch {
    /* */
  }
}

export function destroyYoutubeCue(id: DeckId): void {
  clearYoutubeCue(id);
  try {
    players[id]?.destroy();
  } catch {
    /* */
  }
  players[id] = undefined;
  readyFlags[id] = false;
}
