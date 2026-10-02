/** Autocue shared domain models — mixReady gates real mix/stems. */

export type SourceKind =
  | "spotify"
  | "apple"
  | "local"
  | "demo"
  | "soundcloud"
  | "youtube";

export type DeckId = "A" | "B";
export type StemName = "vocals" | "drums" | "bass" | "other";

/** How stems were produced — shown honestly in UI. */
export type StemMode =
  | "none"
  | "oscillator"
  | "band-split"
  | "demo-stems"
  | "demucs"; // reserved for future WASM/native Demucs

export type AnalyzeStatus = "idle" | "decoding" | "splitting" | "ready" | "error";

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
  /** true only for Local / Demo / decodable audio — never for DRM streams */
  mixReady: boolean;
  artworkUrl?: string;
  previewUrl?: string;
  /** object URL or file path for local / imported audio */
  localUri?: string;
  /** YouTube / YTM video id for official IFrame cue playback */
  youtubeVideoId?: string;
  /** SoundCloud numeric track id for Widget API */
  soundcloudTrackId?: string;
  /** SoundCloud permalink_url for Widget API (preferred over api URL) */
  soundcloudPermalinkUrl?: string;
  reason?: string;
  /** SoundCloud: downloadable / imported mirror */
  downloadable?: boolean;
}

export type StemGains = Record<StemName, number>;
export type StemMutes = Record<StemName, boolean>;
export type StemSolos = Record<StemName, boolean>;

export interface DeckState {
  deckId: DeckId;
  track: Track | null;
  playing: boolean;
  position: number; // 0–1 scrub
  pitchPercent: number;
  synced: boolean;
  stems: StemGains;
  mutes: StemMutes;
  solos: StemSolos;
  seed: number;
  baseFreq: number;
  stemMode: StemMode;
  analyzeStatus: AnalyzeStatus;
  analyzeMessage?: string;
}

export interface StemSet {
  trackId: string;
  modelVersion: string;
  createdAt: string;
  mode: StemMode;
  stems: Record<StemName, { uri?: string; peak?: number }>;
}

export interface SetlistItem {
  track: Track;
  reason: string;
  score: number;
}

export interface SourceConnection {
  id: SourceKind;
  label: string;
  connected: boolean;
  /** cue-only | mix | mock */
  capability: "cue-only" | "mix" | "mock";
  note: string;
}

export const STEM_NAMES: StemName[] = ["vocals", "drums", "bass", "other"];

export const DEFAULT_STEMS: StemGains = {
  vocals: 1,
  drums: 1,
  bass: 1,
  other: 1,
};

export const DEFAULT_MUTES: StemMutes = {
  vocals: false,
  drums: false,
  bass: false,
  other: false,
};

export const DEFAULT_SOLOS: StemSolos = {
  vocals: false,
  drums: false,
  bass: false,
  other: false,
};

export const ACCEPT_AUDIO =
  "audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/m4a,audio/flac,audio/ogg,.mp3,.wav,.m4a,.flac,.ogg";
