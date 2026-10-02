import { useMemo, useRef, useState } from "react";
import type { DeckId, SourceKind, Track } from "../types/models";
import { ACCEPT_AUDIO } from "../types/models";
import { SourceBadge } from "./TrackBadge";
import type { YtmLibraryMode, YtmLibrarySnapshot, YtmPlaylist } from "../data/ytmLibrary";
import type { ScLibraryMode, ScLibrarySnapshot, ScPlaylist } from "../data/soundcloudLibrary";
import { hasGoogleClientId } from "../auth/googleYoutube";
import { hasSoundCloudClientId } from "../auth/soundcloud";

export type SourceFlags = {
  local: boolean;
  soundcloud: boolean;
  youtube: boolean;
  spotify: boolean;
  apple: boolean;
};

type YtmTab = "library" | "playlists" | "recents";
type ScTab = "likes" | "playlists" | "stream";

interface Props {
  sources: SourceFlags;
  onToggle: (id: keyof SourceFlags) => void;
  onLocalFiles: (files: FileList) => void;
  onConnectSoundCloud: () => void;
  onDisconnectSoundCloud: () => void;
  onConnectYouTube: () => void;
  onDisconnectYouTube: () => void;
  scConnecting: boolean;
  ytmConnecting: boolean;
  ytmError?: string | null;
  scError?: string | null;
  ytmMode: YtmLibraryMode;
  scMode: ScLibraryMode;
  ytmLibrary: YtmLibrarySnapshot | null;
  scLibrary: ScLibrarySnapshot | null;
  catalog: Track[];
  focusedDeck: DeckId;
  onLoadTrack: (track: Track, deck?: DeckId) => void;
  analyzing?: boolean;
}

const SOURCE_META: {
  id: keyof SourceFlags;
  label: string;
  capability: string;
  note: string;
}[] = [
  {
    id: "local",
    label: "Local files",
    capability: "Mix-ready",
    note: "Pick .mp3 / .wav / .m4a / .flac — decode + band-split on device.",
  },
  {
    id: "soundcloud",
    label: "SoundCloud",
    capability: "Cue-only",
    note: hasSoundCloudClientId()
      ? "Connect with SoundCloud OAuth (PKCE) to load likes & playlists. Streams stay cue-only."
      : "Add VITE_SOUNDCLOUD_CLIENT_ID in web/.env.local — see docs/SOUNDCLOUD.md.",
  },
  {
    id: "youtube",
    label: "YouTube Music",
    capability: "Cue-only",
    note: hasGoogleClientId()
      ? "Connect with Google to load your YouTube / YTM playlists (cue-only)."
      : "Add VITE_GOOGLE_CLIENT_ID in web/.env.local — see docs/YOUTUBE_MUSIC.md.",
  },
  {
    id: "spotify",
    label: "Spotify",
    capability: "Cue-only",
    note: "Browse / cue / metadata only. No DRM mix or stems.",
  },
  {
    id: "apple",
    label: "Apple Music",
    capability: "Cue-only",
    note: "Browse / cue only. No DRM mix or stems.",
  },
];

export function SourcesPanel({
  sources,
  onToggle,
  onLocalFiles,
  onConnectSoundCloud,
  onDisconnectSoundCloud,
  onConnectYouTube,
  onDisconnectYouTube,
  scConnecting,
  ytmConnecting,
  ytmError,
  scError,
  ytmMode,
  scMode,
  ytmLibrary,
  scLibrary,
  catalog,
  focusedDeck,
  onLoadTrack,
  analyzing,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [ytmTab, setYtmTab] = useState<YtmTab>("playlists");
  const [openPlaylist, setOpenPlaylist] = useState<YtmPlaylist | null>(null);
  const [scTab, setScTab] = useState<ScTab>("likes");
  const [openScPlaylist, setOpenScPlaylist] = useState<ScPlaylist | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const googleConfigured = hasGoogleClientId();
  const scConfigured = hasSoundCloudClientId();

  const connectedCatalog = useMemo(() => {
    return catalog.filter((t) => {
      if (t.source === "demo") return true;
      if (t.source === "local") return sources.local;
      if (t.source === "soundcloud") return sources.soundcloud;
      if (t.source === "youtube") return sources.youtube;
      if (t.source === "spotify") return sources.spotify;
      if (t.source === "apple") return sources.apple;
      return true;
    });
  }, [catalog, sources]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) onLocalFiles(e.dataTransfer.files);
  };

  return (
    <section className="sources-panel" id="sources" aria-label="Sources and library">
      <header className="panel-head">
        <div>
          <h3>Sources / Library</h3>
          <span className="panel-sub">
            Real Google / SoundCloud OAuth when configured · Local &amp; Demo mix · streaming
            cue-only
          </span>
        </div>
        {analyzing && <span className="analyze-pill">Analyzing…</span>}
      </header>

      <div className="source-grid">
        {SOURCE_META.map((s) => {
          const on = sources[s.id];
          return (
            <article key={s.id} className={`source-card${on ? " on" : ""}`}>
              <div className="source-card-top">
                <div>
                  <h4>{s.label}</h4>
                  <span className={`cap-pill cap-${s.id}`}>{s.capability}</span>
                </div>
                {s.id !== "soundcloud" && s.id !== "youtube" && (
                  <label className="src-toggle" title={s.label}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => onToggle(s.id)}
                    />
                    <span className="src-track">
                      <span className="src-thumb" />
                    </span>
                  </label>
                )}
                {(s.id === "soundcloud" || s.id === "youtube") && on && (
                  <span className="connected-pill">Connected</span>
                )}
              </div>
              <p className="source-note">{s.note}</p>

              {s.id === "local" && on && (
                <div
                  className={`dropzone${dragOver ? " over" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                >
                  <button
                    type="button"
                    className="btn btn-local"
                    onClick={() => fileRef.current?.click()}
                  >
                    Choose audio files
                  </button>
                  <span className="drop-hint">or drag &amp; drop</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={ACCEPT_AUDIO}
                    multiple
                    hidden
                    onChange={(e) => {
                      if (e.target.files?.length) onLocalFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}

              {s.id === "soundcloud" && (
                <div className="connect-actions">
                  {!scConfigured && (
                    <div className="setup-cta">
                      <p>
                        <strong>Setup required.</strong> Create a SoundCloud app, set redirect
                        URI to <code>http://localhost:5173/</code>, then add{" "}
                        <code>VITE_SOUNDCLOUD_CLIENT_ID</code> to <code>web/.env.local</code>.
                      </p>
                      <p className="setup-hint">
                        Full steps: <code>docs/SOUNDCLOUD.md</code>. Restart Vite after saving
                        the env file.
                      </p>
                    </div>
                  )}
                  {scConfigured && !on && (
                    <button
                      type="button"
                      className="btn btn-connect sc"
                      disabled={scConnecting}
                      onClick={onConnectSoundCloud}
                    >
                      {scConnecting ? "Redirecting to SoundCloud…" : "Connect SoundCloud"}
                    </button>
                  )}
                  {on && (
                    <button
                      type="button"
                      className="btn btn-disconnect"
                      onClick={onDisconnectSoundCloud}
                    >
                      Disconnect
                    </button>
                  )}
                  {scConfigured && (scConnecting || on) && (
                    <p className="oauth-status">
                      {scConnecting
                        ? "SoundCloud OAuth… exchanging token / loading library"
                        : scMode === "oauth"
                          ? `Connected${scLibrary?.displayName ? ` · ${scLibrary.displayName}` : ""} · cue-only`
                          : "Connected · cue-only"}
                    </p>
                  )}
                  {scError && <p className="connect-error">{scError}</p>}
                </div>
              )}

              {s.id === "youtube" && (
                <div className="connect-actions">
                  {!googleConfigured && (
                    <div className="setup-cta">
                      <p>
                        <strong>Setup required.</strong> Enable YouTube Data API v3, create a
                        Web OAuth client, authorize origin{" "}
                        <code>http://localhost:5173</code>, then add{" "}
                        <code>VITE_GOOGLE_CLIENT_ID</code> to <code>web/.env.local</code>.
                      </p>
                      <p className="setup-hint">
                        Full steps: <code>docs/YOUTUBE_MUSIC.md</code>. Restart Vite after
                        saving. Connect will not fake a demo login.
                      </p>
                    </div>
                  )}
                  {googleConfigured && !on && (
                    <button
                      type="button"
                      className="btn btn-connect yt"
                      disabled={ytmConnecting}
                      onClick={onConnectYouTube}
                    >
                      {ytmConnecting ? "Signing in with Google…" : "Connect with Google"}
                    </button>
                  )}
                  {on && (
                    <button
                      type="button"
                      className="btn btn-disconnect"
                      onClick={onDisconnectYouTube}
                    >
                      Disconnect
                    </button>
                  )}
                  {googleConfigured && (ytmConnecting || on) && (
                    <p className="oauth-status">
                      {ytmConnecting
                        ? "Google OAuth… loading YouTube playlists"
                        : ytmMode === "google"
                          ? "Connected · your YouTube playlists · cue-only"
                          : "Connected · cue-only"}
                    </p>
                  )}
                  {ytmError && <p className="connect-error">{ytmError}</p>}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {sources.youtube && ytmLibrary && ytmMode === "google" && (
        <div className="ytm-browser" aria-label="YouTube Music library">
          <header className="ytm-head">
            <div>
              <h4>YouTube Music</h4>
              <span className="panel-sub">
                Library · Playlists · Recents — GPM-inspired ·{" "}
                <span className="cue-badge">YouTube · cue-only</span>
              </span>
              <p className="ytm-mode-label">Signed in with Google — your playlists</p>
            </div>
            <div className="ytm-tabs" role="tablist">
              {(["library", "playlists", "recents"] as YtmTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={ytmTab === tab}
                  className={`ytm-tab${ytmTab === tab ? " active" : ""}`}
                  onClick={() => {
                    setYtmTab(tab);
                    setOpenPlaylist(null);
                  }}
                >
                  {tab === "library"
                    ? "Library"
                    : tab === "playlists"
                      ? "Playlists"
                      : "Recents"}
                </button>
              ))}
            </div>
          </header>

          {ytmTab === "playlists" && !openPlaylist && (
            <div className="ytm-playlist-grid">
              {ytmLibrary.playlists.map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  className="ytm-pl-card"
                  onClick={() => setOpenPlaylist(pl)}
                  style={{ "--pl-hue": pl.artHue } as React.CSSProperties}
                >
                  <div className="ytm-pl-art" />
                  <div className="ytm-pl-meta">
                    <strong>{pl.title}</strong>
                    <span>
                      {pl.trackCount} songs · {pl.description}
                    </span>
                  </div>
                </button>
              ))}
              {!ytmLibrary.playlists.length && (
                <p className="empty-lib">No playlists yet.</p>
              )}
            </div>
          )}

          {ytmTab === "playlists" && openPlaylist && (
            <div className="ytm-pl-detail">
              <button
                type="button"
                className="ytm-back"
                onClick={() => setOpenPlaylist(null)}
              >
                ← Playlists
              </button>
              <h5>{openPlaylist.title}</h5>
              <p className="panel-sub">{openPlaylist.description}</p>
              <TrackRows
                tracks={ytmLibrary.playlistTracks[openPlaylist.id] ?? []}
                focusedDeck={focusedDeck}
                onLoad={onLoadTrack}
              />
            </div>
          )}

          {ytmTab === "library" && (
            <TrackRows
              tracks={ytmLibrary.library}
              focusedDeck={focusedDeck}
              onLoad={onLoadTrack}
            />
          )}
          {ytmTab === "recents" && (
            <TrackRows
              tracks={ytmLibrary.recents}
              focusedDeck={focusedDeck}
              onLoad={onLoadTrack}
            />
          )}
        </div>
      )}

      {sources.soundcloud && scLibrary && scMode === "oauth" && (
        <div className="sc-browser" aria-label="SoundCloud library">
          <header className="ytm-head">
            <div>
              <h4>SoundCloud{scLibrary.displayName ? ` · ${scLibrary.displayName}` : ""}</h4>
              <span className="panel-sub">
                Likes · Playlists · Stream —{" "}
                <span className="cue-badge sc-cue">SC · cue-only</span>
              </span>
            </div>
            <div className="ytm-tabs sc-tabs" role="tablist">
              {(["likes", "playlists", "stream"] as ScTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={scTab === tab}
                  className={`ytm-tab sc-tab${scTab === tab ? " active" : ""}`}
                  onClick={() => {
                    setScTab(tab);
                    setOpenScPlaylist(null);
                  }}
                >
                  {tab === "likes"
                    ? "Likes"
                    : tab === "playlists"
                      ? "Playlists"
                      : "Stream"}
                </button>
              ))}
            </div>
          </header>

          {scTab === "playlists" && !openScPlaylist && (
            <div className="ytm-playlist-grid">
              {scLibrary.playlists.map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  className="ytm-pl-card sc-pl-card"
                  onClick={() => setOpenScPlaylist(pl)}
                  style={{ "--pl-hue": pl.artHue } as React.CSSProperties}
                >
                  <div className="ytm-pl-art" />
                  <div className="ytm-pl-meta">
                    <strong>{pl.title}</strong>
                    <span>
                      {pl.trackCount} tracks · {pl.description}
                    </span>
                  </div>
                </button>
              ))}
              {!scLibrary.playlists.length && (
                <p className="empty-lib">No playlists yet.</p>
              )}
            </div>
          )}

          {scTab === "playlists" && openScPlaylist && (
            <div className="ytm-pl-detail">
              <button
                type="button"
                className="ytm-back"
                onClick={() => setOpenScPlaylist(null)}
              >
                ← Playlists
              </button>
              <h5>{openScPlaylist.title}</h5>
              <p className="panel-sub">{openScPlaylist.description}</p>
              <TrackRows
                tracks={openScPlaylist.tracks}
                focusedDeck={focusedDeck}
                onLoad={onLoadTrack}
              />
            </div>
          )}

          {scTab === "likes" && (
            <TrackRows
              tracks={scLibrary.likes}
              focusedDeck={focusedDeck}
              onLoad={onLoadTrack}
            />
          )}
          {scTab === "stream" && (
            <TrackRows
              tracks={scLibrary.stream}
              focusedDeck={focusedDeck}
              onLoad={onLoadTrack}
            />
          )}
        </div>
      )}

      <div className="unified-catalog">
        <header className="panel-head tight">
          <h4>Unified catalog</h4>
          <span className="panel-sub">
            {connectedCatalog.length} tracks from connected sources · focused Deck{" "}
            {focusedDeck}
          </span>
        </header>
        <TrackRows
          tracks={connectedCatalog}
          focusedDeck={focusedDeck}
          onLoad={onLoadTrack}
          showSource
        />
      </div>
    </section>
  );
}

function TrackRows({
  tracks,
  onLoad,
  focusedDeck,
  showSource,
}: {
  tracks: Track[];
  onLoad: (t: Track, deck?: DeckId) => void;
  focusedDeck: DeckId;
  showSource?: boolean;
}) {
  if (!tracks.length) {
    return <p className="empty-lib">No tracks in this view.</p>;
  }
  return (
    <ul className="track-rows">
      {tracks.map((t) => (
        <li key={t.id} className="track-row">
          <button
            type="button"
            className="track-row-btn"
            onClick={() => onLoad(t, focusedDeck)}
            title={`Load to Deck ${focusedDeck}`}
          >
            <span className="tr-title">{t.title}</span>
            <span className="tr-artist">
              {t.artist}
              {t.album ? ` · ${t.album}` : ""}
            </span>
            <span className="tr-meta">
              {t.bpm ?? "—"} BPM · {t.camelot ?? "—"}
              {t.mixReady ? " · mix-ready" : " · cue-only"}
            </span>
            {showSource && <SourceBadge source={t.source as SourceKind} />}
            {!showSource && t.source === "youtube" && (
              <span className="cue-badge inline">YouTube · cue-only</span>
            )}
            {!showSource && t.source === "soundcloud" && (
              <span className="cue-badge sc-cue inline">SC · cue-only</span>
            )}
          </button>
          <div className="tr-actions">
            <button
              type="button"
              className="btn btn-mini deck-a"
              title="Load to Deck A"
              onClick={() => onLoad(t, "A")}
            >
              Load A
            </button>
            <button
              type="button"
              className="btn btn-mini deck-b"
              title="Load to Deck B"
              onClick={() => onLoad(t, "B")}
            >
              Load B
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
