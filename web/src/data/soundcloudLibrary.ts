/**
 * SoundCloud library types. Real OAuth populates via auth/soundcloud.ts.
 * Demo snapshot is kept for offline UI tests only — Connect never uses it.
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
  displayName?: string;
}

export type ScLibraryMode = "none" | "oauth";

/** Offline fixture — not used by Connect. */
export function getScLibrarySnapshot(): ScLibrarySnapshot {
  const ALL = [...SOUNDCLOUD_MOCK];
  return {
    likes: ALL.slice(0, 2),
    stream: ALL,
    displayName: "Demo (offline)",
    playlists: [
      {
        id: "sc-pl-offline",
        title: "Offline fixture",
        description: "Not used by Connect",
        trackCount: ALL.length,
        artHue: 24,
        tracks: ALL,
      },
    ],
  };
}

export { SOUNDCLOUD_MOCK as SC_ALL_TRACKS };
