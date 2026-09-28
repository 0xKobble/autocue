/**
 * Web Audio feedback graph — oscillators only.
 * No real Spotify/Apple DRM streams. Mix path is Local/Demo mock.
 */
import type { DeckId, StemGains } from "../types/models";

type Voice = {
  osc: OscillatorNode;
  lfo: OscillatorNode;
  g: GainNode;
  filter: BiquadFilterNode;
};

let audioCtx: AudioContext | null = null;
const voices: Partial<Record<DeckId, Voice>> = {};

export function ensureAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
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

function deckMasterGain(id: DeckId, crossfade: number) {
  if (id === "A") return Math.cos(crossfade * 0.5 * Math.PI);
  return Math.cos((1 - crossfade) * 0.5 * Math.PI);
}

function stemMix(stems: StemGains) {
  return (stems.vocals + stems.drums + stems.bass + stems.other) / 4;
}

export function stopVoice(id: DeckId) {
  const v = voices[id];
  if (!v) return;
  try {
    v.osc.stop();
  } catch {
    /* already stopped */
  }
  try {
    v.lfo.stop();
  } catch {
    /* */
  }
  delete voices[id];
}

export function startVoice(
  id: DeckId,
  opts: {
    playing: boolean;
    baseFreq: number;
    bpm: number;
    stems: StemGains;
    crossfade: number;
  }
) {
  const ctx = ensureAudio();
  if (!ctx) return;
  stopVoice(id);
  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const g = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = id === "A" ? "sawtooth" : "triangle";
  osc.frequency.value = opts.baseFreq;
  lfo.type = "sine";
  lfo.frequency.value = opts.bpm / 60;
  lfoGain.gain.value = 8;
  filter.type = "lowpass";
  filter.frequency.value = 1200 + stemMix(opts.stems) * 1800;

  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  osc.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);

  const level = 0.045 * deckMasterGain(id, opts.crossfade) * Math.max(0.05, stemMix(opts.stems));
  g.gain.value = opts.playing ? level : 0;

  osc.start();
  lfo.start();
  voices[id] = { osc, lfo, g, filter };
}

export function updateVoiceGains(
  id: DeckId,
  opts: { playing: boolean; stems: StemGains; crossfade: number }
) {
  const v = voices[id];
  if (!v || !audioCtx) return;
  const level = opts.playing
    ? 0.045 * deckMasterGain(id, opts.crossfade) * Math.max(0.05, stemMix(opts.stems))
    : 0;
  v.g.gain.setTargetAtTime(level, audioCtx.currentTime, 0.03);
  v.filter.frequency.setTargetAtTime(600 + stemMix(opts.stems) * 2400, audioCtx.currentTime, 0.05);
}
