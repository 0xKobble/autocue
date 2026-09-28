/** Autocue shared domain models — mixReady gates real mix/stems. */

export type SourceKind = "spotify" | "apple" | "local" | "demo";
export type DeckId = "A" | "B";
export type StemName = "vocals" | "drums" | "bass" | "other";

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationMs: number;
  bpm?: number;
  key?: string;
  camelot?: string;
  energy?: number;
  source: SourceKind;
  /** true only for Local / demo — never for DRM streams */
  mixReady: boolean;
  artworkUrl?: string;
  previewUrl?: string;
  localUri?: string;
  reason?: string;
}

export type StemGains = Record<StemName, number>;

export interface DeckState {
  deckId: DeckId;
  track: Track | null;
  playing: boolean;
  position: number; // 0–1 scrub
  pitchPercent: number;
  synced: boolean;
  stems: StemGains;
  seed: number;
  baseFreq: number;
}

export interface StemSet {
  trackId: string;
  modelVersion: string;
  createdAt: string;
  stems: Record<StemName, { uri: string; peak?: number }>;
}

export interface SetlistItem {
  track: Track;
  reason: string;
  score: number;
}

export const STEM_NAMES: StemName[] = ["vocals", "drums", "bass", "other"];

export const DEFAULT_STEMS: StemGains = {
  vocals: 1,
  drums: 1,
  bass: 1,
  other: 1,
};
