import { useCallback, useEffect, useState } from "react";
import { Crossfader } from "./components/Crossfader";
import { Deck } from "./components/Deck";
import { SetlistStrip } from "./components/SetlistStrip";
import { SourcesPanel } from "./components/SourcesPanel";
import { StemPanel } from "./components/StemPanel";
import { YoutubeCueLayer } from "./components/YoutubeCueLayer";
import { SoundcloudCueLayer } from "./components/SoundcloudCueLayer";
import { useDeckEngine } from "./hooks/useDeckEngine";
import type { DeckId, Track } from "./types/models";

export default function App() {
  const engine = useDeckEngine();
  const [helpOpen, setHelpOpen] = useState(false);

  const onLoadId = useCallback(
    (trackId: string) => {
      const track = engine.catalog.find((t) => t.id === trackId);
      if (track) engine.loadToDeck(engine.focused, track);
    },
    [engine]
  );

  const onLoadTrack = useCallback(
    (track: Track, deck?: DeckId) => {
      engine.loadToDeck(deck ?? engine.focused, track);
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
        case "t":
        case "T":
          engine.transitionToDeck(engine.focused === "A" ? "B" : "A");
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
          <a className="chip chip-link" href="#sources" title="Jump to Sources">
            Sources
          </a>
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
          onPitch={(v) => engine.setPitchPercent("A", v)}
        />
        <Crossfader
          value={engine.crossfade}
          meterA={engine.meterA}
          meterB={engine.meterB}
          onChange={engine.onCrossfade}
          autoTransition={engine.autoTransition}
          onAutoTransition={engine.setAutoTransition}
          transitioning={engine.transitioning}
          onTransitionTo={engine.transitionToDeck}
          canTransitionA={Boolean(engine.deckA.track)}
          canTransitionB={Boolean(engine.deckB.track)}
        />
        <Deck
          state={engine.deckB}
          peaks={engine.peaksB}
          focused={engine.focused === "B"}
          onFocus={() => engine.setFocused("B")}
          onPlay={() => engine.togglePlay("B")}
          onCue={() => engine.cueDeck("B")}
          onSync={() => engine.toggleSync("B")}
          onPitch={(v) => engine.setPitchPercent("B", v)}
        />
      </section>

      <StemPanel
        stemTarget={engine.stemTarget}
        onStemTarget={(id: DeckId) => engine.setStemTarget(id)}
        deck={stemDeck}
        onStem={engine.setStem}
        onMute={engine.toggleMute}
        onSolo={engine.toggleSolo}
      />

      <SourcesPanel
        sources={engine.sources}
        onToggle={engine.toggleSource}
        onLocalFiles={engine.importLocalFiles}
        onConnectSoundCloud={engine.connectSoundCloud}
        onDisconnectSoundCloud={engine.disconnectSoundCloud}
        onConnectYouTube={() => void engine.connectYouTube()}
        onDisconnectYouTube={engine.disconnectYouTube}
        scConnecting={engine.scConnecting}
        ytmConnecting={engine.ytmConnecting}
        ytmError={engine.ytmError}
        scError={engine.scError}
        ytmMode={engine.ytmMode}
        scMode={engine.scMode}
        ytmLibrary={engine.ytmLibrary}
        scLibrary={engine.scLibrary}
        catalog={engine.catalog}
        focusedDeck={engine.focused}
        onLoadTrack={onLoadTrack}
        analyzing={engine.globalAnalyzing}
      />

      <SetlistStrip
        items={engine.setlist}
        aiMode={engine.aiMode}
        harmonicOn={engine.harmonicOn}
        energyOn={engine.energyOn}
        onAiMode={engine.setAiMode}
        onHarmonic={engine.setHarmonicOn}
        onEnergy={engine.setEnergyOn}
        onLoad={onLoadId}
      />

      <YoutubeCueLayer />
      <SoundcloudCueLayer />

      <footer className="footer">
        <span>
          Local / Demo = mix + stems · YTM / SC = dual-deck cue + live crossfade · Spotify / Apple = cue-only
        </span>
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
                <kbd>T</kbd> Smooth blend to the other deck (~4s)
              </li>
              <li>
                <kbd>?</kbd> Toggle this help
              </li>
            </ul>
            <p className="help-note">
              Load YouTube or SoundCloud cues onto <strong>both</strong> decks, press Play on
              each, then sweep the crossfader (or hit <kbd>T</kbd> / ← A / B →) for a live
              listening blend. Auto-blend on load starts the incoming deck and fades over ~4s.
              Streams stay cue-only (no stems). Local / Demo = full mix path.
            </p>
            <button type="submit" className="btn btn-dialog">
              Close
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}
