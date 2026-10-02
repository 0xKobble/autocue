import type { SetlistItem } from "../types/models";
import { SourceBadge } from "./TrackBadge";

interface Props {
  items: SetlistItem[];
  aiMode: boolean;
  harmonicOn: boolean;
  energyOn: boolean;
  onAiMode: (v: boolean) => void;
  onHarmonic: (v: boolean) => void;
  onEnergy: (v: boolean) => void;
  onLoad: (trackId: string) => void;
}

export function SetlistStrip({
  items,
  aiMode,
  harmonicOn,
  energyOn,
  onHarmonic,
  onEnergy,
  onLoad,
}: Props) {
  return (
    <section className="setlist" aria-label="AI Setlist">
      <header className="panel-head setlist-head">
        <div>
          <h3>AI Setlist</h3>
          <span className="panel-sub">Suggested next · unified catalog</span>
        </div>
        <div className="setlist-toggles">
          <label className="toggle">
            <input
              type="checkbox"
              checked={harmonicOn}
              onChange={(e) => onHarmonic(e.target.checked)}
            />
            <span>Harmonic</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={energyOn}
              onChange={(e) => onEnergy(e.target.checked)}
            />
            <span>Energy</span>
          </label>
        </div>
      </header>
      <div className={`setlist-strip${aiMode ? "" : " ai-off"}`} role="list">
        {items.map(({ track, reason }) => (
          <article
            key={track.id}
            className="setlist-card"
            role="listitem"
            title="Load suggestion (mock)"
            onClick={() => onLoad(track.id)}
          >
            <h4 className="card-title">{track.title}</h4>
            <p className="card-artist">{track.artist}</p>
            <div className="card-meta">
              <span>
                {track.bpm} · {track.camelot}
              </span>
              <SourceBadge source={track.source} />
            </div>
            <span className="card-reason">
              {reason}
              {track.mixReady ? " · mix-ready" : " · cue-only"}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
