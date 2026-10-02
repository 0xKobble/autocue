/**
 * Live stream cue mix helpers — official YT/SC embeds only.
 * Equal-power crossfade + AI phrase-aware blend planning for dual-deck listening.
 * Never decodes DRM.
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

/** Seconds per beat from BPM. */
export function beatSec(bpm: number): number {
  const b = Number.isFinite(bpm) && bpm > 40 && bpm < 240 ? bpm : 128;
  return 60 / b;
}

/** Phrase length in beats (8 or 16 bars → 32 / 64 beats). Prefer 8 bars when BPM unknown/high energy. */
export function phraseBeats(_bpm: number, energy?: number): number {
  const e = energy ?? 0.6;
  // High energy → shorter 8-bar phrases; chill → 16-bar
  return e >= 0.65 ? 32 : 64;
}

/**
 * Snap a playback position (seconds) forward to the next phrase boundary
 * estimated from BPM beat grid starting at 0.
 */
export function nextPhraseBoundarySec(
  positionSec: number,
  bpm: number,
  energy?: number
): number {
  const beat = beatSec(bpm);
  const phrase = phraseBeats(bpm, energy) * beat;
  if (phrase <= 0) return Math.max(0, positionSec);
  const idx = Math.floor(positionSec / phrase);
  const next = (idx + 1) * phrase;
  // If we're already very close to a boundary (< 1/2 beat), use the following one
  if (next - positionSec < beat * 0.5) return next + phrase;
  return next;
}

/** How many ms until the next phrase boundary (capped). */
export function msUntilPhraseBoundary(
  positionSec: number,
  bpm: number,
  energy?: number,
  maxWaitMs = 8000
): number {
  const next = nextPhraseBoundarySec(positionSec, bpm, energy);
  const wait = Math.max(0, (next - positionSec) * 1000);
  return Math.min(maxWaitMs, wait);
}

export type BlendCurve = "equal-power" | "soft-s";

export interface AiBlendPlan {
  /** Crossfade animation duration */
  durationMs: number;
  /** Beats covered by the blend */
  beats: number;
  /** Wait before starting XF (phrase align on outgoing) */
  delayMs: number;
  /** Incoming seek target in seconds (0 = top, or cue) */
  incomingSeekSec: number;
  /** Human label e.g. "AI blend · 8.2s" */
  label: string;
  /** Soft EQ duck on outgoing Local deck during fade */
  eqDuck: boolean;
  curve: BlendCurve;
}

export interface BlendPlanInput {
  aiMode: boolean;
  outgoing: Track | null | undefined;
  incoming: Track | null | undefined;
  /** Outgoing deck playhead seconds (stream or local). */
  outgoingPositionSec: number;
  /** Prefer start of incoming track when AI Mode is on. */
  preferIncomingTop?: boolean;
}

/**
 * Pick blend length from BPM difference / energy (8–32 beats),
 * align fade near a downbeat/phrase boundary, and label for UX.
 */
export function planAiBlend(input: BlendPlanInput): AiBlendPlan {
  const outBpm = input.outgoing?.bpm ?? 128;
  const inBpm = input.incoming?.bpm ?? outBpm;
  const outEnergy = input.outgoing?.energy ?? 0.6;
  const inEnergy = input.incoming?.energy ?? 0.6;
  const avgBpm = (outBpm + inBpm) / 2;
  const bpmDiff = Math.abs(outBpm - inBpm);
  const energyDelta = Math.abs(outEnergy - inEnergy);

  let beats: number;
  if (!input.aiMode) {
    // Fixed ~4s ≈ 8 beats at 120bpm when AI off
    beats = 8;
  } else {
    // Closer BPM → longer musical blend; big jump → shorter cut
    if (bpmDiff < 3 && energyDelta < 0.15) beats = 32;
    else if (bpmDiff < 8 && energyDelta < 0.3) beats = 16;
    else if (bpmDiff < 16) beats = 12;
    else beats = 8;
    // High outgoing energy → slightly shorter exit
    if (outEnergy > 0.8 && beats > 8) beats = Math.max(8, beats - 4);
  }

  const durationMs = Math.round(
    Math.max(2000, Math.min(20000, beats * beatSec(avgBpm) * 1000))
  );

  const delayMs = input.aiMode
    ? msUntilPhraseBoundary(input.outgoingPositionSec, outBpm, outEnergy, 6000)
    : 0;

  const incomingSeekSec = input.aiMode && (input.preferIncomingTop !== false) ? 0 : -1;

  const totalSec = (delayMs + durationMs) / 1000;
  const label = input.aiMode
    ? `AI blend · ${totalSec.toFixed(1).replace(/\.0$/, "")}s`
    : `Blend · ${(durationMs / 1000).toFixed(1).replace(/\.0$/, "")}s`;

  return {
    durationMs,
    beats,
    delayMs,
    incomingSeekSec,
    label,
    eqDuck: Boolean(input.outgoing?.mixReady),
    curve: "soft-s",
  };
}

/** Ease curves for XF animation. soft-s = smoother DJ-style. */
export function easeBlend(t: number, curve: BlendCurve = "soft-s"): number {
  const x = Math.min(1, Math.max(0, t));
  if (curve === "equal-power") {
    // smoothstep
    return x * x * (3 - 2 * x);
  }
  // smootherstep (Ken Perlin) — softer shoulders
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * EQ duck amount for outgoing Local deck during XF progress (0–1 toward incoming).
 * Returns lowpass cutoff Hz and high-shelf cut dB-ish gain scale.
 * Mid-fade ducks highs hardest so the incoming cuts through.
 */
export function outgoingEqDuck(progress01: number): { lowpassHz: number; highGain: number } {
  // progress 0 = full outgoing, 1 = gone
  const p = Math.min(1, Math.max(0, progress01));
  // Bell: strongest duck around 0.35–0.7
  const mid = Math.sin(p * Math.PI);
  const lowpassHz = 18000 - mid * 12000; // down to ~6k
  const highGain = 1 - mid * 0.55;
  return { lowpassHz, highGain };
}

/**
 * Animate a 0–1 value with selectable ease. Cancels via returned stop().
 */
export function animateValue(
  from: number,
  to: number,
  durationMs: number,
  onFrame: (v: number, progress01: number) => void,
  curve: BlendCurve = "soft-s"
): { promise: Promise<void>; stop: () => void } {
  let raf = 0;
  let stopped = false;
  const start = performance.now();
  const span = to - from;

  const promise = new Promise<void>((resolve) => {
    if (durationMs <= 0 || Math.abs(span) < 0.0001) {
      onFrame(to, 1);
      resolve();
      return;
    }
    const tick = (now: number) => {
      if (stopped) {
        resolve();
        return;
      }
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeBlend(t, curve);
      onFrame(from + span * eased, t);
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

export function delay(ms: number): { promise: Promise<void>; stop: () => void } {
  let timer = 0;
  let stopped = false;
  const promise = new Promise<void>((resolve) => {
    if (ms <= 0) {
      resolve();
      return;
    }
    timer = window.setTimeout(() => {
      if (!stopped) resolve();
    }, ms);
  });
  return {
    promise,
    stop: () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    },
  };
}
