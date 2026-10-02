/**
 * Stem engine interface — client-side.
 *
 * This pass:
 *  - demo-stems: 4 independently synthesized buffers (CDJ-style faders work)
 *  - band-split: spectral / EQ approximation from a single decoded buffer
 *    (honest label: "preview stems / band-split" until Demucs WASM/native)
 *
 * Never run on DRM streams (Spotify / Apple / YouTube Music).
 */
import type { StemMode, StemName } from "../types/models";
import { STEM_NAMES } from "../types/models";
import { ensureAudio } from "./audioGraph";

export type StemBuffers = Record<StemName, AudioBuffer>;

export interface StemJobResult {
  mode: StemMode;
  buffers: StemBuffers;
  durationSec: number;
  label: string;
}

/** Band edges for preview stem approximation (Hz). */
const BANDS: Record<StemName, { type: BiquadFilterType; freq: number; Q?: number }> = {
  bass: { type: "lowpass", freq: 180, Q: 0.7 },
  drums: { type: "bandpass", freq: 1800, Q: 0.55 },
  vocals: { type: "bandpass", freq: 1200, Q: 0.9 },
  other: { type: "highpass", freq: 4500, Q: 0.7 },
};

function fillNoise(buf: Float32Array, amp: number, seed: number) {
  let s = seed || 1;
  for (let i = 0; i < buf.length; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    buf[i] = ((s >>> 0) / 0xffffffff - 0.5) * 2 * amp;
  }
}

/** Build 4 distinct demo stem buffers (procedural, no network). */
export async function buildDemoStemPack(
  durationSec = 30,
  bpm = 128,
  seed = 42
): Promise<StemJobResult> {
  const ctx = ensureAudio();
  if (!ctx) throw new Error("AudioContext unavailable");
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * durationSec);
  const beat = 60 / bpm;

  const vocals = ctx.createBuffer(1, len, sr);
  const drums = ctx.createBuffer(1, len, sr);
  const bass = ctx.createBuffer(1, len, sr);
  const other = ctx.createBuffer(1, len, sr);

  const v = vocals.getChannelData(0);
  const d = drums.getChannelData(0);
  const b = bass.getChannelData(0);
  const o = other.getChannelData(0);

  fillNoise(d, 0.35, seed);
  fillNoise(o, 0.08, seed + 7);

  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const beatPos = (t % beat) / beat;
    // kick + snare-ish
    const kick = beatPos < 0.08 ? Math.sin(2 * Math.PI * 55 * t) * (1 - beatPos / 0.08) * 0.9 : 0;
    const snare =
      Math.abs((t % (beat * 2)) - beat) < 0.04
        ? (Math.random() * 2 - 1) * (1 - Math.abs((t % (beat * 2)) - beat) / 0.04) * 0.45
        : 0;
    d[i] = d[i] * 0.15 * Math.exp(-((t % beat) * 8)) + kick + snare;

    // bass — sub + square-ish
    const bassFreq = 55 * (Math.floor(t / (beat * 4)) % 2 === 0 ? 1 : 1.5);
    b[i] = Math.sin(2 * Math.PI * bassFreq * t) * 0.55 * (0.7 + 0.3 * Math.sin(2 * Math.PI * t * 0.5));

    // vocals — mid tone with vibrato
    const vib = 220 * (1 + 0.02 * Math.sin(2 * Math.PI * 5 * t));
    const env = 0.35 + 0.25 * Math.sin(2 * Math.PI * t / (beat * 8));
    v[i] = Math.sin(2 * Math.PI * vib * t) * env * 0.35;

    // other — pad / noise bed
    o[i] =
      o[i] * 0.4 +
      Math.sin(2 * Math.PI * 440 * t * (1 + 0.01 * Math.sin(t))) * 0.08 +
      Math.sin(2 * Math.PI * 660 * t) * 0.05;
  }

  return {
    mode: "demo-stems",
    buffers: { vocals, drums, bass, other },
    durationSec,
    label: "Demo stem pack · 4 independent buffers",
  };
}

/**
 * Offline band-split: render each filtered stem into its own buffer
 * so CDJ faders control independent content (approximation, not Demucs).
 */
export async function bandSplitBuffer(source: AudioBuffer): Promise<StemJobResult> {
  const sr = source.sampleRate;
  const len = source.length;
  const durationSec = source.duration;
  const channels = source.numberOfChannels;
  const out: Partial<StemBuffers> = {};

  for (const name of STEM_NAMES) {
    const offline = new OfflineAudioContext(1, len, sr);
    const src = offline.createBufferSource();
    // mixdown to mono for stem bus
    const mono = offline.createBuffer(1, len, sr);
    const md = mono.getChannelData(0);
    for (let c = 0; c < channels; c++) {
      const ch = source.getChannelData(c);
      for (let i = 0; i < len; i++) md[i] += ch[i] / channels;
    }
    src.buffer = mono;

    const filter = offline.createBiquadFilter();
    const band = BANDS[name];
    filter.type = band.type;
    filter.frequency.value = band.freq;
    if (band.Q) filter.Q.value = band.Q;

    const g = offline.createGain();
    g.gain.value = name === "drums" ? 1.1 : name === "vocals" ? 1.15 : 1;

    src.connect(filter);
    filter.connect(g);
    g.connect(offline.destination);
    src.start(0);
    out[name] = await offline.startRendering();
  }

  return {
    mode: "band-split",
    buffers: out as StemBuffers,
    durationSec,
    label: "Preview stems · band-split (not Demucs)",
  };
}

/** Decode a File / ArrayBuffer into AudioBuffer. */
export async function decodeAudioFile(file: File | ArrayBuffer): Promise<AudioBuffer> {
  const ctx = ensureAudio();
  if (!ctx) throw new Error("AudioContext unavailable");
  const ab = file instanceof File ? await file.arrayBuffer() : file;
  return await ctx.decodeAudioData(ab.slice(0));
}

export function stemModeLabel(mode: StemMode): string {
  switch (mode) {
    case "demo-stems":
      return "Demo stems · independent buffers";
    case "band-split":
      return "Preview stems · band-split (not Demucs)";
    case "demucs":
      return "Demucs · on-device";
    case "oscillator":
      return "Feedback tone (cue / no file)";
    default:
      return "Stems unavailable";
  }
}
