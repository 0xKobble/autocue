/**
 * SoundCloud OAuth 2.1 Authorization Code + PKCE (SPA).
 * Token exchange goes through Vite /api/soundcloud/token so an optional
 * SOUNDCLOUD_CLIENT_SECRET stays off the client bundle.
 * Tracks stay cue-only (mixReady: false) — no DRM-free stems from SC streams.
 */
import type { Track } from "../types/models";
import type { ScLibrarySnapshot, ScPlaylist } from "../data/soundcloudLibrary";

const AUTH_BASE = "https://secure.soundcloud.com";
const API_BASE = "https://api.soundcloud.com";
const PKCE_VERIFIER_KEY = "autocue_sc_pkce_verifier";
const PKCE_STATE_KEY = "autocue_sc_oauth_state";

export function getSoundCloudClientId(): string {
  return (import.meta.env.VITE_SOUNDCLOUD_CLIENT_ID as string | undefined)?.trim() ?? "";
}

export function hasSoundCloudClientId(): boolean {
  return Boolean(getSoundCloudClientId());
}

export function getSoundCloudRedirectUri(): string {
  const fromEnv = (import.meta.env.VITE_SOUNDCLOUD_REDIRECT_URI as string | undefined)?.trim();
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/`;
  }
  return "http://localhost:5173/";
}

function randomUrlSafe(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64Url(arr);
}

function base64Url(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return base64Url(digest);
}

/** Start SoundCloud OAuth — redirects the browser. */
export async function beginSoundCloudOAuth(): Promise<void> {
  const clientId = getSoundCloudClientId();
  if (!clientId) {
    throw new Error("VITE_SOUNDCLOUD_CLIENT_ID is not set");
  }
  const verifier = randomUrlSafe(64);
  const challenge = await sha256Base64Url(verifier);
  const state = randomUrlSafe(16);
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(PKCE_STATE_KEY, state);

  const url = new URL(`${AUTH_BASE}/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getSoundCloudRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  window.location.assign(url.toString());
}

export interface ScOAuthCallback {
  code: string;
  state: string;
}

/** Parse ?code=&state= (or error=) from the current URL after SC redirect. */
export function readSoundCloudCallback(): ScOAuthCallback | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const err = params.get("error");
  if (err) {
    const desc = params.get("error_description") || err;
    throw new Error(`SoundCloud OAuth: ${desc}`);
  }
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return null;
  return { code, state };
}

export function clearSoundCloudCallbackFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("code") && !url.searchParams.has("error")) return;
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

export interface ScTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

/** Exchange auth code via Vite proxy (keeps optional secret server-side). */
export async function exchangeSoundCloudCode(code: string, state: string): Promise<ScTokenResponse> {
  const expected = sessionStorage.getItem(PKCE_STATE_KEY);
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  if (!expected || state !== expected) {
    throw new Error("SoundCloud OAuth state mismatch — try Connect again");
  }
  if (!verifier) {
    throw new Error("Missing PKCE verifier — try Connect again");
  }
  const clientId = getSoundCloudClientId();
  if (!clientId) {
    throw new Error("VITE_SOUNDCLOUD_CLIENT_ID is not set");
  }

  const res = await fetch("/api/soundcloud/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: getSoundCloudRedirectUri(),
      code_verifier: verifier,
      code,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as ScTokenResponse & {
    error?: string;
    error_description?: string;
    message?: string;
  };
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(PKCE_STATE_KEY);
  if (!res.ok || !body.access_token) {
    throw new Error(
      body.error_description ||
        body.error ||
        body.message ||
        `SoundCloud token exchange failed (${res.status})`
    );
  }
  return body;
}

async function scGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const url = path.startsWith("http") ? new URL(path) : new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json; charset=utf-8",
      Authorization: `OAuth ${token}`,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SoundCloud API ${path} ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

interface ScCollection<T> {
  collection?: T[];
  next_href?: string | null;
}

interface ScUser {
  id?: number;
  username?: string;
  full_name?: string;
  avatar_url?: string;
}

interface ScTrack {
  id?: number;
  title?: string;
  user?: { username?: string; full_name?: string };
  duration?: number;
  artwork_url?: string;
  genre?: string;
  bpm?: number | null;
  downloadable?: boolean;
  permalink_url?: string;
  access?: string;
}

interface ScPlaylistRaw {
  id?: number;
  title?: string;
  description?: string | null;
  track_count?: number;
  artwork_url?: string;
  tracks?: ScTrack[];
}

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function scTrackToTrack(t: ScTrack): Track | null {
  if (!t?.id || !t.title?.trim()) return null;
  const artist =
    t.user?.full_name?.trim() || t.user?.username?.trim() || "SoundCloud";
  const downloadable = Boolean(t.downloadable);
  return {
    id: `sc-real-${t.id}`,
    title: t.title.trim(),
    artist,
    durationMs: typeof t.duration === "number" ? t.duration : 0,
    bpm: typeof t.bpm === "number" && t.bpm > 0 ? Math.round(t.bpm) : undefined,
    source: "soundcloud",
    // Streams stay cue-only; downloadable flag does not unlock DRM-free decode here
    mixReady: false,
    downloadable,
    artworkUrl: t.artwork_url?.replace("-large", "-t500x500") || t.artwork_url,
    reason: "SoundCloud · cue-only",
    energy: 0.65,
    album: t.genre || undefined,
  };
}

async function fetchCollection<T>(
  path: string,
  token: string,
  params: Record<string, string>,
  maxItems: number
): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = null;
  let first = true;
  while (out.length < maxItems) {
    let data: ScCollection<T> | T[];
    if (first) {
      data = await scGet<ScCollection<T> | T[]>(path, token, {
        ...params,
        linked_partitioning: "true",
        limit: String(Math.min(50, maxItems - out.length)),
      });
      first = false;
    } else if (next) {
      data = await scGet<ScCollection<T>>(next, token);
    } else {
      break;
    }
    const items = Array.isArray(data) ? data : data.collection ?? [];
    out.push(...items);
    next = Array.isArray(data) ? null : data.next_href ?? null;
    if (!next) break;
  }
  return out.slice(0, maxItems);
}

/** Fetch /me + likes + playlists for the signed-in user. All cue-only. */
export async function fetchSoundCloudLibrary(accessToken: string): Promise<{
  me: ScUser;
  library: ScLibrarySnapshot;
}> {
  const me = await scGet<ScUser>("/me", accessToken);

  const likeTracks = await fetchCollection<ScTrack>(
    "/me/likes/tracks",
    accessToken,
    {},
    60
  );
  const likes = likeTracks.map(scTrackToTrack).filter(Boolean) as Track[];

  const playlistsRaw = await fetchCollection<ScPlaylistRaw>(
    "/me/playlists",
    accessToken,
    { show_tracks: "true" },
    25
  );

  const playlists: ScPlaylist[] = playlistsRaw.map((pl) => {
    const id = String(pl.id ?? "unknown");
    const tracks = (pl.tracks ?? []).map(scTrackToTrack).filter(Boolean) as Track[];
    return {
      id: `sc-pl-${id}`,
      title: pl.title?.trim() || "Untitled playlist",
      description: (pl.description || "SoundCloud playlist").slice(0, 140),
      trackCount: pl.track_count ?? tracks.length,
      artHue: hueFromId(id),
      tracks,
    };
  });

  // "Stream" ≈ own uploads + recent likes (no separate activity feed in SPA scope)
  const ownTracks = await fetchCollection<ScTrack>("/me/tracks", accessToken, {}, 40);
  const streamMap = new Map<string, Track>();
  for (const t of [...ownTracks.map(scTrackToTrack), ...likes]) {
    if (t && !streamMap.has(t.id)) streamMap.set(t.id, t);
  }
  const stream = Array.from(streamMap.values());

  return {
    me,
    library: {
      likes,
      playlists,
      stream,
      displayName: me.full_name || me.username || "SoundCloud",
    },
  };
}

export async function revokeSoundCloudToken(accessToken: string): Promise<void> {
  try {
    await fetch(`${AUTH_BASE}/sign-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken }),
    });
  } catch {
    /* ignore */
  }
}
