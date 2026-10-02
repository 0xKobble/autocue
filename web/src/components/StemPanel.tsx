import type { DeckId, DeckState, StemName } from "../types/models";
import { STEM_NAMES } from "../types/models";
import { stemModeLabel } from "../audio/stemEngine";

interface Props {
  stemTarget: DeckId;
  onStemTarget: (id: DeckId) => void;
  deck: DeckState;
  onStem: (name: StemName, value01: number) => void;
  onMute: (name: StemName) => void;
  onSolo: (name: StemName) => void;
}

export function StemPanel({
  stemTarget,
  onStemTarget,
  deck,
  onStem,
  onMute,
  onSolo,
}: Props) {
  const mixReady = Boolean(deck.track?.mixReady);
  const source = deck.track?.source ?? "local";
  const analyzing =
    deck.analyzeStatus === "decoding" || deck.analyzeStatus === "splitting";

  return (
    <section className="stems-panel" aria-label="AI Stems">
      <header className="panel-head">
        <h3>AI Stems</h3>
        <span className="panel-sub">
          {mixReady
            ? stemModeLabel(deck.stemMode)
            : "Cue-only · stems disabled"}
        </span>
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
        style={{
          opacity: mixReady && !analyzing ? 1 : 0.45,
          pointerEvents: mixReady && !analyzing ? "auto" : "none",
        }}
      >
        {STEM_NAMES.map((name) => (
          <div className="stem-fader" data-stem={name} key={name}>
            <div className="stem-ms">
              <button
                type="button"
                className={`btn-ms${deck.mutes[name] ? " on" : ""}`}
                onClick={() => onMute(name)}
                disabled={!mixReady}
                title="Mute"
              >
                M
              </button>
              <button
                type="button"
                className={`btn-ms solo${deck.solos[name] ? " on" : ""}`}
                onClick={() => onSolo(name)}
                disabled={!mixReady}
                title="Solo"
              >
                S
              </button>
            </div>
            <label>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(deck.stems[name] * 100)}
                disabled={!mixReady || analyzing}
                onChange={(e) => onStem(name, Number(e.target.value) / 100)}
                aria-label={name}
                {...({ orient: "vertical" } as Record<string, string>)}
              />
              <span className="stem-name">{name}</span>
            </label>
          </div>
        ))}
      </div>
      <p className={`stem-note${mixReady ? "" : " warn"}`}>
        {analyzing
          ? `Deck ${stemTarget}: ${deck.analyzeMessage ?? "Analyzing…"}`
          : mixReady
            ? `Deck ${stemTarget} mix-ready — ${deck.analyzeMessage ?? stemModeLabel(deck.stemMode)} (${source}).`
            : `Deck ${stemTarget} is cue-only (${source}). Split disabled — upload Local / Demo for real stems.`}
      </p>
    </section>
  );
}
