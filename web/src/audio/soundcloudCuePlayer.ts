/**
 * Official SoundCloud Widget API — cue-only deck audio.
 * Never decodes DRM streams; Play/Pause/volume only via embed.
 */
import type { DeckId, Track } from "../types/models";

const API_SRC = "https://w.soundcloud.com/player/api.js";

interface ScWidget {
  bind: (event: string, listener: (...args: unknown[]) => void) => void;
  unbind: (event: string) => void;
  load: (
    url: string,
    options?: {
      auto_play?: boolean;
      show_artwork?: boolean;
      visual?: boolean;
      hide_related?: boolean;
      show_comments?: boolean;
      show_user?: boolean;
      show_reposts?: boolean;
      callback?: () => void;
    }
  ) => void;
  play: () => void;
  pause: () => void;
  seekTo: (ms: number) => void;
  setVolume: (vol: number) => void;
  getVolume: (cb: (vol: number) => void) => void;
  getDuration: (cb: (ms: number) => void) => void;
  getPosition: (cb: (ms: number) => void) => void;
  isPaused: (cb: (paused: boolean) => void) => void;
}

declare global {
  interface Window {
    SC?: {
      Widget: ((el: HTMLIFrameElement | string) => ScWidget) & {
        Events: {
          READY: string;
          PLAY: string;
          PAUSE: string;
          FINISH: string;
          SEEK: string;
          PLAY_PROGRESS: string;
          LOAD_PROGRESS: string;
        };
      };
    };
  }
}

const widgets: Partial<Record<DeckId, ScWidget>> = {};
const readyFlags: Partial<Record<DeckId, boolean>> = {};
const cueUrls: Partial<Record<DeckId, string>> = {};
const readyWaiters: Partial<Record<DeckId, Array<() => void>>> = {};
const durationMsCache: Partial<Record<DeckId, number>> = {};
const positionMsCache: Partial<Record<DeckId, number>> = {};

type CueErrorHandler = (id: DeckId, message: string) => void;
type CueStateHandler = (id: DeckId, playing: boolean) => void;

let errorHandler: CueErrorHandler | null = null;
let stateHandler: CueStateHandler | null = null;

let apiLoading: Promise<void> | null = null;

export function setSoundcloudCueErrorHandler(handler: CueErrorHandler | null) {
  errorHandler = handler;
}

export function setSoundcloudCueStateHandler(handler: CueStateHandler | null) {
  stateHandler = handler;
}

/** Prefer permalink; else api.soundcloud.com/tracks/<id>; else parse sc-real-<id>. */
export function soundcloudCueUrlOf(track: Track | null | undefined): string | null {
  if (!track || track.source !== "soundcloud") return null;
  if (track.mixReady) return null; // Local / demo mix path owns audio
  const permalink = track.soundcloudPermalinkUrl?.trim();
  if (permalink) return permalink;
  const explicit = track.soundcloudTrackId?.trim();
  if (explicit && /^\d+$/.test(explicit)) {
    return `https://api.soundcloud.com/tracks/${explicit}`;
  }
  const m = /^sc-real-(\d+)$/.exec(track.id);
  if (m?.[1]) return `https://api.soundcloud.com/tracks/${m[1]}`;
  return null;
}

export function loadSoundcloudWidgetApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.SC?.Widget) return Promise.resolve();
  if (apiLoading) return apiLoading;
  apiLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${API_SRC}"]`);
    if (existing) {
      const start = Date.now();
      const poll = () => {
        if (window.SC?.Widget) {
          resolve();
          return;
        }
        if (Date.now() - start > 10000) {
          apiLoading = null;
          reject(new Error("SoundCloud Widget API timed out"));
          return;
        }
        window.setTimeout(poll, 50);
      };
      poll();
      return;
    }
    const s = document.createElement("script");
    s.src = API_SRC;
    s.async = true;
    s.onload = () => {
      if (window.SC?.Widget) resolve();
      else {
        apiLoading = null;
        reject(new Error("SoundCloud Widget API missing after load"));
      }
    };
    s.onerror = () => {
      apiLoading = null;
      reject(new Error("Failed to load SoundCloud Widget API"));
    };
    document.head.appendChild(s);
  });
  return apiLoading;
}

function waitReady(id: DeckId): Promise<void> {
  if (readyFlags[id] && widgets[id]) return Promise.resolve();
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

function ensureHostElement(id: DeckId): HTMLIFrameElement {
  let layer = document.getElementById("sc-cue-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "sc-cue-layer";
    layer.className = "sc-cue-layer";
    layer.setAttribute("aria-label", "SoundCloud cue players");
    document.body.appendChild(layer);
  }
  let slot = document.getElementById(`sc-cue-slot-${id}`);
  if (!slot) {
    slot = document.createElement("div");
    slot.id = `sc-cue-slot-${id}`;
    slot.className = "sc-cue-slot";
    slot.dataset.deck = id;
    slot.dataset.active = "false";
    const label = document.createElement("span");
    label.className = "sc-cue-label";
    label.textContent = `Deck ${id} · SC`;
    const host = document.createElement("div");
    host.id = `sc-cue-host-${id}`;
    host.className = "sc-cue-host";
    slot.appendChild(label);
    slot.appendChild(host);
    layer.appendChild(slot);
  }
  const host = document.getElementById(`sc-cue-host-${id}`);
  if (!host) throw new Error(`Missing SoundCloud host for deck ${id}`);

  let iframe = document.getElementById(`sc-cue-iframe-${id}`) as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = `sc-cue-iframe-${id}`;
    iframe.title = `SoundCloud cue deck ${id}`;
    iframe.allow = "autoplay";
    iframe.scrolling = "no";
    iframe.frameBorder = "no";
    iframe.setAttribute("allowfullscreen", "");
    // Minimal placeholder until loadSoundcloudCue sets a real track URL
    iframe.src =
      "https://w.soundcloud.com/player/?url=" +
      encodeURIComponent("https://api.soundcloud.com/tracks/293") +
      "&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&visual=false";
    host.innerHTML = "";
    host.appendChild(iframe);
  }
  return iframe;
}

function setSlotActive(id: DeckId, active: boolean) {
  const slot = document.getElementById(`sc-cue-slot-${id}`);
  if (slot) slot.dataset.active = active ? "true" : "false";
}

function bindWidgetEvents(id: DeckId, widget: ScWidget) {
  const Events = window.SC!.Widget.Events;
  widget.bind(Events.PLAY, () => {
    stateHandler?.(id, true);
  });
  widget.bind(Events.PAUSE, () => {
    stateHandler?.(id, false);
  });
  widget.bind(Events.FINISH, () => {
    stateHandler?.(id, false);
  });
  widget.bind(Events.PLAY_PROGRESS, (...args: unknown[]) => {
    const data = args[0] as { currentPosition?: number; relativePosition?: number } | undefined;
    if (typeof data?.currentPosition === "number") {
      positionMsCache[id] = data.currentPosition;
    }
    if (typeof data?.relativePosition === "number" && data.relativePosition > 0) {
      const rel = data.relativePosition;
      const cur = data.currentPosition ?? 0;
      if (rel > 0 && cur > 0) {
        durationMsCache[id] = cur / rel;
      }
    }
  });
}

async function ensureWidget(id: DeckId): Promise<ScWidget> {
  await loadSoundcloudWidgetApi();
  if (widgets[id] && readyFlags[id]) return widgets[id]!;
  if (widgets[id]) {
    await waitReady(id);
    return widgets[id]!;
  }
  if (!window.SC?.Widget) {
    throw new Error("SoundCloud Widget API unavailable");
  }
  const iframe = ensureHostElement(id);
  await new Promise<void>((resolve, reject) => {
    try {
      const widget = window.SC!.Widget(iframe);
      widgets[id] = widget;
      const Events = window.SC!.Widget.Events;
      widget.bind(Events.READY, () => {
        bindWidgetEvents(id, widget);
        flushReady(id);
        resolve();
      });
      window.setTimeout(() => {
        if (!readyFlags[id]) {
          if (widgets[id]) {
            bindWidgetEvents(id, widgets[id]!);
            flushReady(id);
            resolve();
          } else {
            reject(new Error("SoundCloud widget timed out"));
          }
        }
      }, 10000);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
  return widgets[id]!;
}

function refreshDuration(id: DeckId, widget: ScWidget) {
  try {
    widget.getDuration((ms) => {
      if (typeof ms === "number" && ms > 0) durationMsCache[id] = ms;
    });
  } catch {
    /* */
  }
}

export async function loadSoundcloudCue(
  id: DeckId,
  url: string,
  opts?: { autoplay?: boolean }
): Promise<void> {
  const widget = await ensureWidget(id);
  cueUrls[id] = url;
  positionMsCache[id] = 0;
  durationMsCache[id] = undefined;
  setSlotActive(id, true);
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      refreshDuration(id, widget);
      resolve();
    };
    try {
      widget.load(url, {
        auto_play: Boolean(opts?.autoplay),
        show_artwork: true,
        visual: false,
        hide_related: true,
        show_comments: false,
        show_user: true,
        show_reposts: false,
        callback: done,
      });
      window.setTimeout(done, 6000);
    } catch (err) {
      settled = true;
      const msg = err instanceof Error ? err.message : "SoundCloud load failed";
      errorHandler?.(id, msg);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export async function playSoundcloudCue(id: DeckId): Promise<void> {
  const widget = await ensureWidget(id);
  try {
    widget.play();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "SoundCloud play failed";
    errorHandler?.(id, msg);
    throw err instanceof Error ? err : new Error(msg);
  }
}

export function pauseSoundcloudCue(id: DeckId): void {
  try {
    widgets[id]?.pause();
  } catch {
    /* */
  }
}

export function stopSoundcloudCue(id: DeckId): void {
  try {
    widgets[id]?.pause();
    widgets[id]?.seekTo(0);
    positionMsCache[id] = 0;
  } catch {
    /* */
  }
}

/** Volume 0–1 → SoundCloud 0–100. */
export function setSoundcloudCueVolume(id: DeckId, vol01: number): void {
  const w = widgets[id];
  if (!w) return;
  const v = Math.round(Math.max(0, Math.min(1, vol01)) * 100);
  try {
    w.setVolume(v);
  } catch {
    /* */
  }
}

export function seekSoundcloudCue(id: DeckId, seconds: number): void {
  try {
    const ms = Math.max(0, seconds) * 1000;
    widgets[id]?.seekTo(ms);
    positionMsCache[id] = ms;
  } catch {
    /* */
  }
}

export function getSoundcloudCuePosition01(id: DeckId): number | null {
  const dur = durationMsCache[id];
  const pos = positionMsCache[id];
  if (dur == null || !Number.isFinite(dur) || dur <= 0) return null;
  if (pos == null || !Number.isFinite(pos)) return 0;
  return Math.min(0.999, Math.max(0, pos / dur));
}

export function getSoundcloudCueDurationSec(id: DeckId): number | null {
  const dur = durationMsCache[id];
  if (dur == null || !Number.isFinite(dur) || dur <= 0) return null;
  return dur / 1000;
}

export function clearSoundcloudCue(id: DeckId): void {
  cueUrls[id] = undefined;
  setSlotActive(id, false);
  try {
    widgets[id]?.pause();
  } catch {
    /* */
  }
}

export function destroySoundcloudCue(id: DeckId): void {
  clearSoundcloudCue(id);
  widgets[id] = undefined;
  readyFlags[id] = false;
  durationMsCache[id] = undefined;
  positionMsCache[id] = undefined;
  const iframe = document.getElementById(`sc-cue-iframe-${id}`);
  iframe?.remove();
  const host = document.getElementById(`sc-cue-host-${id}`);
  if (host) host.innerHTML = "";
}
