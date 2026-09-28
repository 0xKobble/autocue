import type { DeckId, DeckState, StemName } from "../types/models";
import { STEM_NAMES } from "../types/models";

interface Props {
  stemTarget: DeckId;
  onStemTarget: (id: DeckId) => void;
  deck: DeckState;
  onStem: (name: StemName, value01: number) => void;
}

export function StemPanel({ stemTarget, onStemTarget, deck, onStem }: Props) {
  const mixReady = Boolean(deck.track?.mixReady);
  const source = deck.track?.source ?? "local";

  return (
    <section className="stems-panel" aria-label="AI Stems">
      <header className="panel-head">
        <h3>AI Stems</h3>
        <span className="panel-sub">On-device · Vocals / Drums / Bass / Other</span>
      </header>
      <div className="stem-deck-tabs">
        <button
          type="button"
          className={`stem-tab${stemTarget === "A" ? " active" : ""}`}
          data-stem-deck="A"
          onClick={() => onStemTarget("A")}
        >
          Deck A
        </button>
        <button
          type="button"
          className={`stem-tab${stemTarget === "B" ? " active" : ""}`}
          data-stem-deck="B"
          onClick={() => onStemTarget("B")}
        >
          Deck B
        </button>
      </div>
      <div
        className="stem-faders"
        data-active-deck={stemTarget}
        style={{ opacity: mixReady ? 1 : 0.45, pointerEvents: mixReady ? "auto" : "none" }}
      >
        {STEM_NAMES.map((name) => (
          <label className="stem-fader" data-stem={name} key={name}>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(deck.stems[name] * 100)}
              disabled={!mixReady}
              onChange={(e) => onStem(name, Number(e.target.value) / 100)}
              aria-label={name}
              // vertical via CSS writing-mode; non-standard orient for WebKit
              {...({ orient: "vertical" } as Record<string, string>)}
            />
            <span className="stem-name">{name}</span>
          </label>
        ))}
      </div>
      <p className={`stem-note${mixReady ? "" : " warn"}`}>
        {mixReady
          ? `Deck ${stemTarget} is mix-ready — stems active (${source}).`
          : `Deck ${stemTarget} is cue-only (${source} DRM). Split disabled — use Local Mode for real stems.`}
      </p>
    </section>
  );
}
