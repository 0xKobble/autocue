import { useMemo, useRef, useState } from "react";
import type { SourceKind, Track } from "../types/models";
import { ACCEPT_AUDIO } from "../types/models";
import { SourceBadge } from "./TrackBadge";
import { getYtmLibrarySnapshot, type YtmPlaylist } from "../data/ytmLibrary";

export type SourceFlags = {
  local: boolean;
  soundcloud: boolean;
  youtube: boolean;
  spotify: boolean;
  apple: boolean;
};

type YtmTab = "library" | "playlists" | "recents";

interface Props {
  sources: SourceFlags;
  onToggle: (id: keyof SourceFlags) => void;
  onLocalFiles: (files: FileList) => void;
  onConnectSoundCloud: () => void;
  onConnectYouTube: () => void;
  scConnecting: boolean;
  ytmConnecting: boolean;
  catalog: Track[];
  onLoadTrack: (track: Track) => void;
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
    capability: "Mock OAuth",
    note: "Mock catalog. Real API needs a SoundCloud client id (not in repo).",
  },
  {
    id: "youtube",
    label: "YouTube Music",
    capability: "Cue-only",
    note: "GPM-style library UI. Tracks stay cue/browse — never mixReady.",
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
  onConnectYouTube,
  scConnecting,
  ytmConnecting,
  catalog,
  onLoadTrack,
  analyzing,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [ytmTab, setYtmTab] = useState<YtmTab>("library");
  const [openPlaylist, setOpenPlaylist] = useState<YtmPlaylist | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const ytm = useMemo(() => getYtmLibrarySnapshot(), []);

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
    <section className="sources-panel" aria-label="Sources and library">
      <header className="panel-head">
        <div>
          <h3>Sources / Library</h3>
          <span className="panel-sub">
            Connect catalogs · Local &amp; Demo mix · streaming cue-only
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
                <label className="src-toggle" title={s.label}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      if (s.id === "soundcloud" && !on) onConnectSoundCloud();
                      else if (s.id === "youtube" && !on) onConnectYouTube();
                      else onToggle(s.id);
                    }}
                    disabled={
                      (s.id === "soundcloud" && scConnecting) ||
                      (s.id === "youtube" && ytmConnecting)
                    }
                  />
                  <span className="src-track">
                    <span className="src-thumb" />
                  </span>
                </label>
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
              {s.id === "soundcloud" && (scConnecting || on) && (
                <p className="mock-oauth">
                  {scConnecting
                    ? "Mock OAuth… authorizing SoundCloud"
                    : "Connected (mock) · client id required for real API"}
                </p>
              )}
              {s.id === "youtube" && (ytmConnecting || on) && (
                <p className="mock-oauth">
                  {ytmConnecting
                    ? "Mock OAuth… authorizing YouTube Music"
                    : "Connected (mock) · GPM-style library below · cue-only"}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {sources.youtube && (
        <div className="ytm-browser" aria-label="YouTube Music library">
          <header className="ytm-head">
            <div>
              <h4>YouTube Music</h4>
              <span className="panel-sub">
                Library · Playlists · Recents — GPM-inspired browse · cue-only
              </span>
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
              {ytm.playlists.map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  className="ytm-pl-card"
                  onClick={() => setOpenPlaylist(pl)}
                  style={
                    {
                      "--pl-hue": pl.artHue,
                    } as React.CSSProperties
                  }
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
                tracks={ytm.playlistTracks[openPlaylist.id] ?? []}
                onLoad={onLoadTrack}
              />
            </div>
          )}

          {ytmTab === "library" && (
            <TrackRows tracks={ytm.library} onLoad={onLoadTrack} />
          )}
          {ytmTab === "recents" && (
            <TrackRows tracks={ytm.recents} onLoad={onLoadTrack} />
          )}
        </div>
      )}

      <div className="unified-catalog">
        <header className="panel-head tight">
          <h4>Unified catalog</h4>
          <span className="panel-sub">
            {connectedCatalog.length} tracks from connected sources
          </span>
        </header>
        <TrackRows tracks={connectedCatalog} onLoad={onLoadTrack} showSource />
      </div>
    </section>
  );
}

function TrackRows({
  tracks,
  onLoad,
  showSource,
}: {
  tracks: Track[];
  onLoad: (t: Track) => void;
  showSource?: boolean;
}) {
  return (
    <ul className="track-rows">
      {tracks.map((t) => (
        <li key={t.id} className="track-row">
          <button type="button" className="track-row-btn" onClick={() => onLoad(t)}>
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
          </button>
          <div className="tr-actions">
            <button
              type="button"
              className="btn btn-mini"
              title="Load to focused deck"
              onClick={() => onLoad(t)}
            >
              Load
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
