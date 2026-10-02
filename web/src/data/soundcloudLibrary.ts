/**
 * SoundCloud mock library — cue-only browse (downloadable mirrors can be mix-ready).
 */
import type { Track } from "../types/models";
import { SOUNDCLOUD_MOCK } from "./mockCatalog";

export interface ScPlaylist {
  id: string;
  title: string;
  description: string;
  trackCount: number;
  artHue: number;
  tracks: Track[];
}

export interface ScLibrarySnapshot {
  likes: Track[];
  playlists: ScPlaylist[];
  stream: Track[];
}

const EXTRA: Track[] = [
  {
    id: "sc-lib-1",
    title: "Warehouse Warmup",
    artist: "Dockside",
    durationMs: 298000,
    bpm: 126,
    camelot: "8A",
    key: "Am",
    source: "soundcloud",
    mixReady: false,
    reason: "SoundCloud · likes",
    energy: 0.79,
  },
  {
    id: "sc-lib-2",
    title: "Analog Drift",
    artist: "Tape Room",
    durationMs: 244000,
    bpm: 120,
    camelot: "5A",
    key: "Cm",
    source: "soundcloud",
    mixReady: false,
    reason: "SoundCloud · stream",
    energy: 0.62,
  },
  {
    id: "sc-lib-3",
    title: "SC Mirror — Bass Archive",
    artist: "Low Bit",
    durationMs: 310000,
    bpm: 132,
    camelot: "10A",
    key: "Bm",
    source: "soundcloud",
    mixReady: true,
    downloadable: true,
    reason: "SC download · mix-ready mirror",
    energy: 0.9,
  },
];

const ALL = [...SOUNDCLOUD_MOCK, ...EXTRA];

export function getScLibrarySnapshot(): ScLibrarySnapshot {
  return {
    likes: [ALL[0], EXTRA[0], ALL[1], EXTRA[1]].filter(Boolean),
    stream: ALL,
    playlists: [
      {
        id: "sc-pl-sets",
        title: "Liked sets",
        description: "Mock SoundCloud likes",
        trackCount: 3,
        artHue: 24,
        tracks: [ALL[0], EXTRA[0], EXTRA[2]].filter(Boolean),
      },
      {
        id: "sc-pl-dl",
        title: "Downloadable",
        description: "Mix-ready mirrors when available",
        trackCount: 2,
        artHue: 18,
        tracks: ALL.filter((t) => t.downloadable || t.mixReady),
      },
    ],
  };
}

export { ALL as SC_ALL_TRACKS };
