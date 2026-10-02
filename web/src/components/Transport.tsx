interface Props {
  playing: boolean;
  synced: boolean;
  pitchPercent: number;
  onPlay: () => void;
  onCue: () => void;
  onSync: () => void;
  onPitch: (v: number) => void;
}

export function Transport({
  playing,
  synced,
  pitchPercent,
  onPlay,
  onCue,
  onSync,
  onPitch,
}: Props) {
  return (
    <div className="transport">
      <button type="button" className="btn btn-cue" onClick={onCue} title="Cue">
        CUE
      </button>
      <button
        type="button"
        className="btn btn-play"
        onClick={onPlay}
        title="Play / Pause"
        aria-pressed={playing}
      >
        <span className="icon-play" />
      </button>
      <button
        type="button"
        className={`btn btn-sync${synced ? " active" : ""}`}
        onClick={onSync}
        title="Sync BPM (mix-ready decks)"
      >
        SYNC
      </button>
      <label className="pitch-fader" title="Pitch / jog feel">
        <span className="pitch-label">
          {pitchPercent >= 0 ? "+" : ""}
          {pitchPercent.toFixed(1)}%
        </span>
        <input
          type="range"
          min={-8}
          max={8}
          step={0.1}
          value={pitchPercent}
          onChange={(e) => onPitch(Number(e.target.value))}
          aria-label="Pitch percent"
        />
      </label>
    </div>
  );
}
