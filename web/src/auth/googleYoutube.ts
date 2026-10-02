/**
 * Optional Google Identity Services + YouTube Data API v3.
 * When VITE_GOOGLE_CLIENT_ID is set, Connect fetches the user's playlists
 * (YouTube / YouTube Music–linked). Always cue-only — no stream URLs.
 */
import type { Track } from "../types/models";
import type { YtmLibrarySnapshot, YtmPlaylist } from "../data/ytmLibrary";

const SCOPES =
  "openid email profile https://www.googleapis.com/auth/youtube.readonly";

const GIS_SRC = "https://accounts.google.com/gsi/client";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: {
              access_token?: string;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

export function getGoogleClientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? "";
}

export function hasGoogleClientId(): boolean {
  return Boolean(getGoogleClientId());
}

let gisLoading: Promise<void> | null = null;

export function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoading) return gisLoading;
  gisLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("GIS script failed")));
      if (window.google?.accounts?.oauth2) resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gisLoading = null;
      reject(new Error("Failed to load Google Identity Services"));
    };
    document.head.appendChild(s);
  });
  return gisLoading;
}

export function requestGoogleAccessToken(): Promise<string> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    return Promise.reject(new Error("VITE_GOOGLE_CLIENT_ID is not set"));
  }
  return loadGisScript().then(
    () =>
      new Promise<string>((resolve, reject) => {
        if (!window.google?.accounts?.oauth2) {
          reject(new Error("Google Identity Services unavailable"));
          return;
        }
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (resp) => {
            if (resp.error || !resp.access_token) {
              reject(
                new Error(
                  resp.error_description || resp.error || "Google sign-in cancelled"
                )
              );
              return;
            }
            resolve(resp.access_token);
          },
          error_callback: (err) => {
            reject(new Error(err.message || err.type || "Google sign-in error"));
          },
        });
        client.requestAccessToken({ prompt: "consent" });
      })
  );
}

export function revokeGoogleToken(token: string): void {
  try {
    window.google?.accounts?.oauth2?.revoke(token);
  } catch {
    /* ignore */
  }
}

interface YtPlaylistItem {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    thumbnails?: { default?: { url?: string }; medium?: { url?: string } };
  };
  contentDetails?: { itemCount?: number };
}

interface YtPlaylistList {
  items?: YtPlaylistItem[];
  nextPageToken?: string;
}

interface YtPlaylistItemRow {
  snippet?: {
    title?: string;
    videoOwnerChannelTitle?: string;
    resourceId?: { videoId?: string };
    thumbnails?: { default?: { url?: string }; medium?: { url?: string } };
  };
  contentDetails?: { videoId?: string };
}

interface YtPlaylistItemsList {
  items?: YtPlaylistItemRow[];
  nextPageToken?: string;
}

async function ytGet<T>(path: string, token: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`YouTube API ${path} ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function rowToTrack(row: YtPlaylistItemRow, playlistTitle: string): Track | null {
  const videoId =
    row.contentDetails?.videoId || row.snippet?.resourceId?.videoId || "";
  const title = row.snippet?.title?.trim();
  if (!videoId || !title || title === "Deleted video" || title === "Private video") {
    return null;
  }
  const artist =
    row.snippet?.videoOwnerChannelTitle?.trim() || "YouTube Music";
  const art =
    row.snippet?.thumbnails?.medium?.url ||
    row.snippet?.thumbnails?.default?.url;
  return {
    id: `yt-real-${videoId}`,
    title,
    artist,
    album: playlistTitle,
    durationMs: 0,
    source: "youtube",
    mixReady: false,
    artworkUrl: art,
    reason: "YouTube · cue-only",
    energy: 0.6,
  };
}

async function fetchPlaylistTracks(
  token: string,
  playlistId: string,
  playlistTitle: string,
  maxItems = 40
): Promise<Track[]> {
  const tracks: Track[] = [];
  let pageToken = "";
  while (tracks.length < maxItems) {
    const params: Record<string, string> = {
      part: "snippet,contentDetails",
      playlistId,
      maxResults: String(Math.min(50, maxItems - tracks.length)),
    };
    if (pageToken) params.pageToken = pageToken;
    const data = await ytGet<YtPlaylistItemsList>("playlistItems", token, params);
    for (const item of data.items ?? []) {
      const t = rowToTrack(item, playlistTitle);
      if (t) tracks.push(t);
      if (tracks.length >= maxItems) break;
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return tracks;
}

/** Fetch the signed-in user's playlists + items; all cue-only. */
export async function fetchYoutubeLibrary(accessToken: string): Promise<YtmLibrarySnapshot> {
  const playlistsRaw: YtPlaylistItem[] = [];
  let pageToken = "";
  do {
    const params: Record<string, string> = {
      part: "snippet,contentDetails",
      mine: "true",
      maxResults: "25",
    };
    if (pageToken) params.pageToken = pageToken;
    const data = await ytGet<YtPlaylistList>("playlists", accessToken, params);
    playlistsRaw.push(...(data.items ?? []));
    pageToken = data.nextPageToken ?? "";
  } while (pageToken && playlistsRaw.length < 40);

  const playlists: YtmPlaylist[] = [];
  const playlistTracks: Record<string, Track[]> = {};
  const libraryMap = new Map<string, Track>();

  // Cap playlist detail fetches to keep Connect snappy
  const toFetch = playlistsRaw.slice(0, 12);
  for (const pl of toFetch) {
    const title = pl.snippet?.title?.trim() || "Untitled playlist";
    const id = pl.id;
    const tracks = await fetchPlaylistTracks(accessToken, id, title, 35);
    playlistTracks[id] = tracks;
    for (const t of tracks) libraryMap.set(t.id, t);
    playlists.push({
      id,
      title,
      description: (pl.snippet?.description || "YouTube playlist").slice(0, 120),
      trackCount: pl.contentDetails?.itemCount ?? tracks.length,
      trackIds: tracks.map((t) => t.id),
      artHue: hueFromId(id),
    });
  }

  // Also list leftover playlist shells without items (browse titles only)
  for (const pl of playlistsRaw.slice(12)) {
    const title = pl.snippet?.title?.trim() || "Untitled playlist";
    playlists.push({
      id: pl.id,
      title,
      description: "Open later · not prefetched",
      trackCount: pl.contentDetails?.itemCount ?? 0,
      trackIds: [],
      artHue: hueFromId(pl.id),
    });
    playlistTracks[pl.id] = [];
  }

  const library = Array.from(libraryMap.values());
  const recents = library.slice(0, 12);

  if (!playlists.length && !library.length) {
    // Empty account — still return a usable empty GPM shell
    return {
      library: [],
      recents: [],
      playlists: [
        {
          id: "pl-empty",
          title: "No playlists found",
          description: "Create playlists in YouTube / YouTube Music, then reconnect",
          trackCount: 0,
          trackIds: [],
          artHue: 0,
        },
      ],
      playlistTracks: { "pl-empty": [] },
    };
  }

  return { library, recents, playlists, playlistTracks };
}
