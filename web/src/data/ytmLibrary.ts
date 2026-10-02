/**
 * YouTube Music mock library — GPM-inspired browse UX.
 * All tracks are cue-only (mixReady: false). Real OAuth uses googleYoutube.ts.
 */
import type { Track } from "../types/models";
import { YOUTUBE_MOCK } from "./mockCatalog";

export interface YtmPlaylist {
  id: string;
  title: string;
  description: string;
  trackCount: number;
  trackIds: string[];
  artHue: number;
}

export interface YtmLibrarySnapshot {
  recents: Track[];
  library: Track[];
  playlists: YtmPlaylist[];
  playlistTracks: Record<string, Track[]>;
}

export type YtmLibraryMode = "demo" | "google";

const EXTRA: Track[] = [
  {
    id: "yt-lib-1",
    title: "Sodium Lights",
    artist: "Afterhours Cartel",
    album: "Night Shift",
    durationMs: 241000,
    bpm: 124,
    camelot: "8A",
    key: "Am",
    source: "youtube",
    mixReady: false,
    reason: "YouTube · cue-only",
    energy: 0.72,
  },
  {
    id: "yt-lib-2",
    title: "Paper Moons",
    artist: "Lumen Arc",
    album: "Analog Soft",
    durationMs: 198000,
    bpm: 118,
    camelot: "5A",
    key: "Cm",
    source: "youtube",
    mixReady: false,
    reason: "YouTube · cue-only",
    energy: 0.58,
  },
  {
    id: "yt-lib-3",
    title: "Freight Elevator",
    artist: "Basement Index",
    album: "Service Stairs",
    durationMs: 312000,
    bpm: 128,
    camelot: "9A",
    key: "Em",
    source: "youtube",
    mixReady: false,
    reason: "YouTube · cue-only",
    energy: 0.81,
  },
  {
    id: "yt-lib-4",
    title: "Violet Static (Live Edit)",
    artist: "Pulse Theory",
    album: "Bootlegs",
    durationMs: 356000,
    bpm: 126,
    camelot: "9A",
    key: "Em",
    source: "youtube",
    mixReady: false,
    reason: "YouTube · cue-only",
    energy: 0.77,
  },
  {
    id: "yt-lib-5",
    title: "Gridlock Hymn",
    artist: "Metro Fiction",
    album: "Chrome Skyline",
    durationMs: 274000,
    bpm: 130,
    camelot: "10A",
    key: "Bm",
    source: "youtube",
    mixReady: false,
    reason: "YouTube · cue-only",
    energy: 0.88,
  },
  {
    id: "yt-lib-6",
    title: "Warm Cache",
    artist: "Soft Circuit",
    album: "Harbor Lights",
    durationMs: 265000,
    bpm: 122,
    camelot: "7A",
    key: "Dm",
    source: "youtube",
    mixReady: false,
    reason: "YouTube · cue-only",
    energy: 0.64,
  },
];

const ALL: Track[] = [...YOUTUBE_MOCK, ...EXTRA];

const PLAYLISTS: YtmPlaylist[] = [
  {
    id: "pl-likes",
    title: "Liked music",
    description: "Songs you liked on YouTube Music",
    trackCount: 4,
    trackIds: ["yt-lib-3", "t9", "yt-lib-1", "t10"],
    artHue: 320,
  },
  {
    id: "pl-workout",
    title: "Workout mix",
    description: "High energy · auto",
    trackCount: 3,
    trackIds: ["t10", "yt-lib-5", "yt-lib-3"],
    artHue: 95,
  },
  {
    id: "pl-late",
    title: "Late night cue",
    description: "Prep for dual-deck practice",
    trackCount: 4,
    trackIds: ["yt-lib-2", "yt-lib-6", "t9", "yt-lib-4"],
    artHue: 260,
  },
  {
    id: "pl-uploads",
    title: "Your uploads",
    description: "Uploaded tracks (still cue-only in Autocue)",
    trackCount: 2,
    trackIds: ["yt-lib-4", "yt-lib-1"],
    artHue: 200,
  },
];

function byId(id: string): Track | undefined {
  return ALL.find((t) => t.id === id);
}

/** Rich demo library used when VITE_GOOGLE_CLIENT_ID is unset. */
export function getYtmLibrarySnapshot(): YtmLibrarySnapshot {
  const playlistTracks: Record<string, Track[]> = {};
  for (const pl of PLAYLISTS) {
    playlistTracks[pl.id] = pl.trackIds.map(byId).filter(Boolean) as Track[];
  }
  return {
    library: ALL,
    recents: [ALL[0], EXTRA[2], EXTRA[0], ALL[1], EXTRA[4]].filter(Boolean),
    playlists: PLAYLISTS,
    playlistTracks,
  };
}

export { ALL as YTM_ALL_TRACKS };
