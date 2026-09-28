import { useCallback, useEffect, useState } from "react";
import { Crossfader } from "./components/Crossfader";
import { Deck } from "./components/Deck";
import { SetlistStrip } from "./components/SetlistStrip";
import { StemPanel } from "./components/StemPanel";
import { useDeckEngine } from "./hooks/useDeckEngine";
import type { DeckId } from "./types/models";

export default function App() {
  const engine = useDeckEngine();
  const [helpOpen, setHelpOpen] = useState(false);

  const onLoad = useCallback(
    (trackId: string) => {
      const track = engine.catalog.find((t) => t.id === trackId);
      if (track) engine.loadToDeck(engine.focused, track);
    },
    [engine]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches?.("input, textarea")) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          engine.togglePlay(engine.focused);
          break;
        case "a":
        case "A":
          engine.setFocused("A");
          break;
        case "b":
        case "B":
          engine.setFocused("B");
          break;
        case "q":
        case "Q":
          engine.cueDeck(engine.focused);
          break;
        case "ArrowLeft":
          engine.onCrossfade(Math.max(0, engine.crossfade - 0.03));
          break;
        case "ArrowRight":
          engine.onCrossfade(Math.min(1, engine.crossfade + 0.03));
          break;
        case "?":
          setHelpOpen(true);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine]);

  const stemDeck = engine.stemTarget === "A" ? engine.deckA : engine.deckB;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="wordmark">Autocue</span>
          <span className="tagline">Cue. Split. Mix. Anywhere.</span>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="chip"
            title="Keyboard shortcuts"
            onClick={() => setHelpOpen(true)}
          >
            ?
          </button>
          <label className="ai-mode" title="AI Mode">
            <input
              type="checkbox"
              checked={engine.aiMode}
              onChange={(e) => engine.setAiMode(e.target.checked)}
            />
            <span className="ai-mode-track">
              <span className="ai-mode-thumb" />
            </span>
            <span className="ai-mode-label">AI Mode</span>
          </label>
        </div>
      </header>

      <section className="decks" aria-label="Dual decks">
        <Deck
          state={engine.deckA}
          peaks={engine.peaksA}
          focused={engine.focused === "A"}
          onFocus={() => engine.setFocused("A")}
          onPlay={() => engine.togglePlay("A")}
          onCue={() => engine.cueDeck("A")}
          onSync={() => engine.toggleSync("A")}
        />
        <Crossfader
          value={engine.crossfade}
          meterA={engine.meterA}
          meterB={engine.meterB}
          onChange={engine.onCrossfade}
        />
        <Deck
          state={engine.deckB}
          peaks={engine.peaksB}
          focused={engine.focused === "B"}
          onFocus={() => engine.setFocused("B")}
          onPlay={() => engine.togglePlay("B")}
          onCue={() => engine.cueDeck("B")}
          onSync={() => engine.toggleSync("B")}
        />
      </section>

      <StemPanel
        stemTarget={engine.stemTarget}
        onStemTarget={(id: DeckId) => engine.setStemTarget(id)}
        deck={stemDeck}
        onStem={engine.setStem}
      />

      <SetlistStrip
        items={engine.setlist}
        aiMode={engine.aiMode}
        harmonicOn={engine.harmonicOn}
        energyOn={engine.energyOn}
        onAiMode={engine.setAiMode}
        onHarmonic={engine.setHarmonicOn}
        onEnergy={engine.setEnergyOn}
        onLoad={onLoad}
      />

      <footer className="footer">
        <span>Web app · mock data · no real Spotify/Apple streaming</span>
        <span className="footer-brand">Autocue</span>
      </footer>

      {helpOpen && (
        <dialog className="help-dialog" open onClose={() => setHelpOpen(false)}>
          <form
            method="dialog"
            onSubmit={(e) => {
              e.preventDefault();
              setHelpOpen(false);
            }}
          >
            <h3>Shortcuts</h3>
            <ul>
              <li>
                <kbd>Space</kbd> Play / pause focused deck
              </li>
              <li>
                <kbd>A</kbd> / <kbd>B</kbd> Focus deck
              </li>
              <li>
                <kbd>Q</kbd> Cue focused deck
              </li>
              <li>
                <kbd>←</kbd> <kbd>→</kbd> Nudge crossfader
              </li>
              <li>
                <kbd>?</kbd> Toggle this help
              </li>
            </ul>
            <button type="submit" className="btn btn-dialog">
              Close
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}
