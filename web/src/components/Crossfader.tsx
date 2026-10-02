interface Props {
  value: number; // 0–1
  meterA: number;
  meterB: number;
  onChange: (v: number) => void;
  autoTransition: boolean;
  onAutoTransition: (on: boolean) => void;
  transitioning: boolean;
  transitionLabel: string | null;
  onTransitionTo: (deck: "A" | "B") => void;
  onSkipNext: () => void;
  canTransitionA: boolean;
  canTransitionB: boolean;
  aiMode: boolean;
}

export function Crossfader({
  value,
  meterA,
  meterB,
  onChange,
  autoTransition,
  onAutoTransition,
  transitioning,
  transitionLabel,
  onTransitionTo,
  onSkipNext,
  canTransitionA,
  canTransitionB,
  aiMode,
}: Props) {
  return (
    <aside className="mixer" aria-label="Mixer">
      <div className="xfader-block">
        <label className="xfader-label" htmlFor="crossfader">
          Crossfader
          {transitioning ? (
            <span className="xf-live"> · {transitionLabel ?? "blending"}</span>
          ) : null}
        </label>
        <input
          type="range"
          id="crossfader"
          className="crossfader"
          min={0}
          max={100}
          value={Math.round(value * 100)}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          disabled={transitioning}
        />
        <div className="xfader-ends">
          <span className="xf-a">A</span>
          <span className="xf-b">B</span>
        </div>
        <div className="xf-actions">
          <button
            type="button"
            className="btn btn-xf"
            disabled={!canTransitionA || transitioning}
            onClick={() => onTransitionTo("A")}
            title="Smooth fade to Deck A (phrase-aware when AI Mode is on)"
          >
            ← A
          </button>
          <button
            type="button"
            className="btn btn-xf btn-xf-next"
            disabled={transitioning}
            onClick={onSkipNext}
            title="Skip / Next — load next setlist track onto the free deck and AI-blend (N)"
          >
            Next
          </button>
          <button
            type="button"
            className="btn btn-xf"
            disabled={!canTransitionB || transitioning}
            onClick={() => onTransitionTo("B")}
            title="Smooth fade to Deck B (phrase-aware when AI Mode is on)"
          >
            B →
          </button>
        </div>
        <label
          className="xf-auto"
          title={
            aiMode
              ? "Load a stream onto the other deck → wait for phrase boundary, then AI blend (BPM/energy length)"
              : "When you load a stream cue onto the other deck, auto-play and blend (~4s)"
          }
        >
          <input
            type="checkbox"
            checked={autoTransition}
            onChange={(e) => onAutoTransition(e.target.checked)}
          />
          <span>{aiMode ? "AI auto-blend" : "Auto-blend on load"}</span>
        </label>
      </div>
      <div className="master-meter" aria-hidden="true">
        <div className="meter-bar" id="meter-a" style={{ height: `${meterA}%` }} />
        <div className="meter-bar" id="meter-b" style={{ height: `${meterB}%` }} />
      </div>
    </aside>
  );
}
