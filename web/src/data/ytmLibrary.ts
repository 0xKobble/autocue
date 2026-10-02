/**
 * YouTube Music library types. Real OAuth uses auth/googleYoutube.ts.
 * Demo snapshot kept for offline tests only — Connect never uses it.
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

/** "none" = not connected. "google" = real YouTube Data API session. */
export type YtmLibraryMode = "none" | "google";

/** Offline fixture — not used by Connect. */
export function getYtmLibrarySnapshot(): YtmLibrarySnapshot {
  const ALL = [...YOUTUBE_MOCK];
  const playlists: YtmPlaylist[] = [
    {
      id: "pl-offline",
      title: "Offline fixture",
      description: "Not used by Connect",
      trackCount: ALL.length,
      trackIds: ALL.map((t) => t.id),
      artHue: 320,
    },
  ];
  return {
    library: ALL,
    recents: ALL.slice(0, 4),
    playlists,
    playlistTracks: { "pl-offline": ALL },
  };
}

export { YOUTUBE_MOCK as YTM_ALL_TRACKS };
