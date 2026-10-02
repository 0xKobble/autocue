/**
 * Web Audio deck graph — real buffers when mixReady; oscillator feedback for cue-only.
 * Never decodes DRM streams (Spotify / Apple / YouTube Music).
 */
import type { DeckId, StemGains, StemMutes, StemSolos, StemName, StemMode } from "../types/models";
import { STEM_NAMES } from "../types/models";
import type { StemBuffers } from "./stemEngine";
import { outgoingEqDuck } from "./streamCueMix";

type DeckNodes = {
  master: GainNode;
  /** Soft EQ duck during AI/auto XF (Local/Demo only). */
  xfFilter: BiquadFilterNode;
  stemGains: Record<StemName, GainNode>;
  sources: AudioBufferSourceNode[];
  osc: OscillatorNode | null;
  lfo: OscillatorNode | null;
  filter: BiquadFilterNode | null;
  buffers: StemBuffers | null;
  mode: StemMode;
  startedAt: number;
  offsetSec: number;
  durationSec: number;
  playing: boolean;
  pitchPercent: number;
  rate: number;
};

let audioCtx: AudioContext | null = null;
const decks: Partial<Record<DeckId, DeckNodes>> = {};

export function ensureAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

export function getAudioContext(): AudioContext | null {
  return audioCtx;
}

function deckMasterGain(id: DeckId, crossfade: number) {
  if (id === "A") return Math.cos(crossfade * 0.5 * Math.PI);
  return Math.cos((1 - crossfade) * 0.5 * Math.PI);
}

function effectiveStemGain(
  name: StemName,
  stems: StemGains,
  mutes: StemMutes,
  solos: StemSolos
): number {
  const anySolo = STEM_NAMES.some((n) => solos[n]);
  if (mutes[name]) return 0;
  if (anySolo && !solos[name]) return 0;
  return stems[name];
}

function ensureDeck(id: DeckId): DeckNodes | null {
  const ctx = ensureAudio();
  if (!ctx) return null;
  let d = decks[id];
  if (!d) {
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    const xfFilter = ctx.createBiquadFilter();
    xfFilter.type = "lowpass";
    xfFilter.frequency.value = 18000;
    xfFilter.Q.value = 0.7;
    xfFilter.connect(master);
    const stemGains = {} as Record<StemName, GainNode>;
    for (const n of STEM_NAMES) {
      const g = ctx.createGain();
      g.gain.value = 1;
      g.connect(xfFilter);
      stemGains[n] = g;
    }
    d = {
      master,
      xfFilter,
      stemGains,
      sources: [],
      osc: null,
      lfo: null,
      filter: null,
      buffers: null,
      mode: "none",
      startedAt: 0,
      offsetSec: 0,
      durationSec: 30,
      playing: false,
      pitchPercent: 0,
      rate: 1,
    };
    decks[id] = d;
  }
  return d;
}

function stopSources(d: DeckNodes) {
  for (const s of d.sources) {
    try {
      s.stop();
    } catch {
      /* */
    }
    try {
      s.disconnect();
    } catch {
      /* */
    }
  }
  d.sources = [];
  if (d.osc) {
    try {
      d.osc.stop();
    } catch {
      /* */
    }
    try {
      d.osc.disconnect();
    } catch {
      /* */
    }
    d.osc = null;
  }
  if (d.lfo) {
    try {
      d.lfo.stop();
    } catch {
      /* */
    }
    try {
      d.lfo.disconnect();
    } catch {
      /* */
    }
    d.lfo = null;
  }
  if (d.filter) {
    try {
      d.filter.disconnect();
    } catch {
      /* */
    }
    d.filter = null;
  }
}

export function playClick(freq = 880, dur = 0.05, gain = 0.15) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

export function loadStemBuffers(
  id: DeckId,
  buffers: StemBuffers,
  mode: StemMode,
  durationSec?: number
) {
  const d = ensureDeck(id);
  if (!d) return;
  stopSources(d);
  d.buffers = buffers;
  d.mode = mode;
  d.durationSec = durationSec ?? buffers.vocals.duration;
  d.offsetSec = 0;
  d.playing = false;
  d.master.gain.value = 0;
}

export function clearDeckAudio(id: DeckId) {
  const d = decks[id];
  if (!d) return;
  stopSources(d);
  d.buffers = null;
  d.mode = "none";
  d.playing = false;
  d.master.gain.value = 0;
}

function startBufferPlayback(id: DeckId, offsetSec: number) {
  const ctx = ensureAudio();
  const d = decks[id];
  if (!ctx || !d || !d.buffers) return;
  stopSources(d);
  const rate = 1 + d.pitchPercent / 100;
  d.rate = rate;
  for (const name of STEM_NAMES) {
    const src = ctx.createBufferSource();
    src.buffer = d.buffers[name];
    src.playbackRate.value = rate;
    src.loop = true;
    src.connect(d.stemGains[name]);
    const startOff = Math.min(Math.max(0, offsetSec), Math.max(0, d.durationSec - 0.05));
    src.start(0, startOff);
    d.sources.push(src);
  }
  d.startedAt = ctx.currentTime;
  d.offsetSec = offsetSec;
  d.playing = true;
}

function startOscillator(
  id: DeckId,
  opts: { baseFreq: number; bpm: number; stems: StemGains; crossfade: number }
) {
  const ctx = ensureAudio();
  const d = ensureDeck(id);
  if (!ctx || !d) return;
  stopSources(d);
  d.mode = "oscillator";
  d.buffers = null;
  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = id === "A" ? "sawtooth" : "triangle";
  osc.frequency.value = opts.baseFreq * (1 + d.pitchPercent / 100);
  lfo.type = "sine";
  lfo.frequency.value = opts.bpm / 60;
  lfoGain.gain.value = 8;
  filter.type = "lowpass";
  filter.frequency.value = 1800;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  osc.connect(filter);
  // route osc into all stem gains lightly so stem faders still color cue tone
  filter.connect(d.stemGains.vocals);
  filter.connect(d.stemGains.drums);
  filter.connect(d.stemGains.bass);
  filter.connect(d.stemGains.other);
  osc.start();
  lfo.start();
  d.osc = osc;
  d.lfo = lfo;
  d.filter = filter;
  d.startedAt = ctx.currentTime;
  d.playing = true;
  d.durationSec = 30;
  applyGains(id, {
    playing: true,
    stems: opts.stems,
    mutes: { vocals: false, drums: false, bass: false, other: false },
    solos: { vocals: false, drums: false, bass: false, other: false },
    crossfade: opts.crossfade,
  });
}

export function startDeck(
  id: DeckId,
  opts: {
    mixReady: boolean;
    baseFreq: number;
    bpm: number;
    stems: StemGains;
    mutes: StemMutes;
    solos: StemSolos;
    crossfade: number;
    offset01?: number;
  }
) {
  const d = ensureDeck(id);
  if (!d) return;
  const offsetSec = (opts.offset01 ?? 0) * d.durationSec;
  if (opts.mixReady && d.buffers) {
    startBufferPlayback(id, offsetSec);
    applyGains(id, {
      playing: true,
      stems: opts.stems,
      mutes: opts.mutes,
      solos: opts.solos,
      crossfade: opts.crossfade,
    });
  } else {
    startOscillator(id, opts);
  }
}

export function stopDeck(id: DeckId) {
  const d = decks[id];
  if (!d || !audioCtx) return;
  if (d.playing && d.buffers) {
    const elapsed = (audioCtx.currentTime - d.startedAt) * d.rate;
    d.offsetSec = (d.offsetSec + elapsed) % d.durationSec;
  }
  stopSources(d);
  d.playing = false;
  d.master.gain.setTargetAtTime(0, audioCtx.currentTime, 0.02);
}

export function applyGains(
  id: DeckId,
  opts: {
    playing: boolean;
    stems: StemGains;
    mutes: StemMutes;
    solos: StemSolos;
    crossfade: number;
  }
) {
  const d = decks[id];
  if (!d || !audioCtx) return;
  const master = opts.playing ? 0.55 * deckMasterGain(id, opts.crossfade) : 0;
  // oscillator path is quieter
  const scale = d.mode === "oscillator" ? 0.08 : 1;
  d.master.gain.setTargetAtTime(master * scale, audioCtx.currentTime, 0.03);
  for (const n of STEM_NAMES) {
    const g = effectiveStemGain(n, opts.stems, opts.mutes, opts.solos);
    d.stemGains[n].gain.setTargetAtTime(g, audioCtx.currentTime, 0.03);
  }
}

export function setPitch(id: DeckId, pitchPercent: number) {
  const d = decks[id];
  if (!d) return;
  d.pitchPercent = pitchPercent;
  const rate = 1 + pitchPercent / 100;
  d.rate = rate;
  for (const s of d.sources) {
    try {
      s.playbackRate.setTargetAtTime(rate, audioCtx!.currentTime, 0.05);
    } catch {
      /* */
    }
  }
  if (d.osc) {
    // base handled by caller restart usually; nudge frequency
    d.osc.frequency.setTargetAtTime(
      (id === "A" ? 220 : 196) * rate,
      audioCtx!.currentTime,
      0.05
    );
  }
}

export function getDeckPosition01(id: DeckId): number {
  const d = decks[id];
  if (!d || !audioCtx || d.durationSec <= 0) return 0;
  if (!d.playing) return d.offsetSec / d.durationSec;
  const elapsed = (audioCtx.currentTime - d.startedAt) * d.rate;
  const pos = ((d.offsetSec + elapsed) % d.durationSec) / d.durationSec;
  return Math.min(0.999, Math.max(0, pos));
}

export function seekDeck(id: DeckId, position01: number, playing: boolean, gains: {
  mixReady: boolean;
  baseFreq: number;
  bpm: number;
  stems: StemGains;
  mutes: StemMutes;
  solos: StemSolos;
  crossfade: number;
}) {
  const d = ensureDeck(id);
  if (!d) return;
  d.offsetSec = position01 * d.durationSec;
  if (playing) {
    startDeck(id, { ...gains, offset01: position01 });
  }
}

export function getDeckMode(id: DeckId): StemMode {
  return decks[id]?.mode ?? "none";
}

export function getDeckDuration(id: DeckId): number {
  return decks[id]?.durationSec ?? 0;
}


/** Soft high/low duck on outgoing Local deck during XF (progress 0=full, 1=gone). null = reset. */
export function setXfEqDuck(id: DeckId, progress01: number | null) {
  const d = decks[id];
  if (!d || !audioCtx) return;
  if (progress01 == null) {
    d.xfFilter.frequency.setTargetAtTime(18000, audioCtx.currentTime, 0.04);
    return;
  }
  const { lowpassHz } = outgoingEqDuck(progress01);
  d.xfFilter.frequency.setTargetAtTime(lowpassHz, audioCtx.currentTime, 0.03);
}

export function clearXfEqDuck(id: DeckId) {
  setXfEqDuck(id, null);
}

/** Peaks from first stem buffer (or mono mix of vocals). */
export function peaksFromBuffers(buffers: StemBuffers, bars = 96): number[][] {
  const layers: number[][] = [];
  for (const name of STEM_NAMES) {
    const buf = buffers[name];
    const data = buf.getChannelData(0);
    const block = Math.floor(data.length / bars) || 1;
    const layer: number[] = [];
    for (let i = 0; i < bars; i++) {
      let peak = 0;
      const start = i * block;
      for (let j = 0; j < block && start + j < data.length; j++) {
        peak = Math.max(peak, Math.abs(data[start + j]));
      }
      layer.push(Math.min(1, peak * 1.8));
    }
    layers.push(layer);
  }
  return layers;
}
