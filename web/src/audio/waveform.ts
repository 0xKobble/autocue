import type { StemName } from "../types/models";
import { STEM_NAMES } from "../types/models";

export function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generatePeaks(seed: number, layers = 4, bars = 96): number[][] {
  const rand = mulberry32(seed);
  const peaks: number[][] = [];
  for (let L = 0; L < layers; L++) {
    const layer: number[] = [];
    let env = 0.4;
    for (let i = 0; i < bars; i++) {
      env += (rand() - 0.48) * 0.15;
      env = Math.max(0.12, Math.min(0.98, env));
      const kick = L === 1 && i % 4 === 0 ? 0.25 : 0;
      const vocal = L === 0 ? Math.sin(i / 6) * 0.15 + 0.1 : 0;
      layer.push(Math.min(1, env * (0.55 + rand() * 0.45) + kick + Math.abs(vocal)));
    }
    peaks.push(layer);
  }
  return peaks;
}

export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

export const STEM_COLORS_A: Record<StemName, string> = {
  vocals: "rgba(255, 120, 180, 0.85)",
  drums: "rgba(184, 255, 60, 0.9)",
  bass: "rgba(80, 180, 255, 0.85)",
  other: "rgba(180, 160, 255, 0.75)",
};

export const STEM_COLORS_B: Record<StemName, string> = {
  vocals: "rgba(255, 140, 200, 0.85)",
  drums: "rgba(160, 130, 255, 0.9)",
  bass: "rgba(120, 200, 255, 0.85)",
  other: "rgba(200, 180, 255, 0.7)",
};

export { STEM_NAMES };
