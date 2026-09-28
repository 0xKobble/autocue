import type { DeckId, DeckState } from "../types/models";
import { TrackBadge } from "./TrackBadge";
import { Transport } from "./Transport";
import { Waveform } from "./Waveform";

interface Props {
  state: DeckState;
  peaks: number[][];
  focused: boolean;
  onFocus: () => void;
  onPlay: () => void;
  onCue: () => void;
  onSync: () => void;
}

export function Deck({
  state,
  peaks,
  focused,
  onFocus,
  onPlay,
  onCue,
  onSync,
}: Props) {
  const id = state.deckId as DeckId;
  const track = state.track;

  return (
    <article
      className={`deck deck-${id.toLowerCase()}${focused ? " focused" : ""}`}
      data-deck={id}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("button")) onFocus();
      }}
    >
      <header className="deck-head">
        <span className="deck-label">Deck {id}</span>
        {track && <TrackBadge source={track.source} mixReady={track.mixReady} />}
      </header>
      <div className="track-meta">
        <h2 className="track-title">{track?.title ?? "—"}</h2>
        <p className="track-artist">{track?.artist ?? ""}</p>
        <p className="track-stats">
          <span>{track?.bpm ? `${track.bpm} BPM` : "—"}</span>
          <span className="dot">·</span>
          <span>{track?.camelot ?? "—"}</span>
          <span className="dot">·</span>
          <span>{track?.key ?? "—"}</span>
        </p>
      </div>
      {!track?.mixReady && track && (
        <p className="cue-banner">
          Streaming: cue &amp; browse only. Load Local / Demo for full mix &amp; stems.
        </p>
      )}
      <Waveform
        deckId={id}
        peaks={peaks}
        stems={state.stems}
        position={state.position}
        playing={state.playing}
      />
      <Transport
        deckId={id}
        playing={state.playing}
        synced={state.synced}
        onPlay={onPlay}
        onCue={onCue}
        onSync={onSync}
      />
    </article>
  );
}
