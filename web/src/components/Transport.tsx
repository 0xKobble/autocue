import type { DeckId } from "../types/models";

interface Props {
  deckId: DeckId;
  playing: boolean;
  synced: boolean;
  onPlay: () => void;
  onCue: () => void;
  onSync: () => void;
}

export function Transport({ playing, synced, onPlay, onCue, onSync }: Props) {
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
        title="Sync"
      >
        SYNC
      </button>
    </div>
  );
}
