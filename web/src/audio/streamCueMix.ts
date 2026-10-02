/**
 * Live stream cue mix helpers — official YT/SC embeds only.
 * Equal-power crossfade for dual-deck listening; never decodes DRM.
 */
import type { DeckId, Track } from "../types/models";
import { soundcloudCueUrlOf } from "./soundcloudCuePlayer";
import { youtubeVideoIdOf } from "./youtubeCuePlayer";

export type StreamCueKind = "youtube" | "soundcloud";

export function streamCueKindOf(track: Track | null | undefined): StreamCueKind | null {
  if (!track || track.mixReady) return null;
  if (youtubeVideoIdOf(track)) return "youtube";
  if (soundcloudCueUrlOf(track)) return "soundcloud";
  return null;
}

export function isStreamCueTrack(track: Track | null | undefined): boolean {
  return streamCueKindOf(track) != null;
}

/** Equal-power crossfade gains (0–1). xf=0 → full A, xf=1 → full B. */
export function deckXfVolume(id: DeckId, crossfade: number): number {
  if (id === "A") return Math.cos(crossfade * 0.5 * Math.PI);
  return Math.cos((1 - crossfade) * 0.5 * Math.PI);
}

export const DEFAULT_TRANSITION_MS = 4000;

/**
 * Animate a 0–1 value with ease-in-out. Cancels via returned stop().
 * Calls onFrame every raf; resolves when done (or cancelled).
 */
export function animateValue(
  from: number,
  to: number,
  durationMs: number,
  onFrame: (v: number) => void
): { promise: Promise<void>; stop: () => void } {
  let raf = 0;
  let stopped = false;
  const start = performance.now();
  const span = to - from;

  const promise = new Promise<void>((resolve) => {
    if (durationMs <= 0 || Math.abs(span) < 0.0001) {
      onFrame(to);
      resolve();
      return;
    }
    const tick = (now: number) => {
      if (stopped) {
        resolve();
        return;
      }
      const t = Math.min(1, (now - start) / durationMs);
      // smoothstep
      const eased = t * t * (3 - 2 * t);
      onFrame(from + span * eased);
      if (t >= 1) {
        resolve();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });

  return {
    promise,
    stop: () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
    },
  };
}
