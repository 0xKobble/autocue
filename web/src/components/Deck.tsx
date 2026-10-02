import { soundcloudCueUrlOf } from "../audio/soundcloudCuePlayer";
import { youtubeVideoIdOf } from "../audio/youtubeCuePlayer";
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
  onPitch: (v: number) => void;
}

function cueBanner(track: NonNullable<DeckState["track"]>): string {
  if (youtubeVideoIdOf(track)) {
    return "YouTube cue: Play uses the official embed. Crossfader blends with the other deck — stems off.";
  }
  if (soundcloudCueUrlOf(track)) {
    return "SoundCloud cue: Play uses the official Widget. Crossfader blends with the other deck — stems off.";
  }
  return "Streaming: cue & browse only. Load Local / Demo for full mix & stems.";
}

export function Deck({
  state,
  peaks,
  focused,
  onFocus,
  onPlay,
  onCue,
  onSync,
  onPitch,
}: Props) {
  const id = state.deckId as DeckId;
  const track = state.track;
  const analyzing =
    state.analyzeStatus === "decoding" || state.analyzeStatus === "splitting";

  return (
    <article
      className={`deck deck-${id.toLowerCase()}${focused ? " focused" : ""}`}
      data-deck={id}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("button, input, label")) onFocus();
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
      {!track?.mixReady && track && <p className="cue-banner">{cueBanner(track)}</p>}
      {(analyzing || state.analyzeStatus === "error") && (
        <p className={`analyze-banner${state.analyzeStatus === "error" ? " error" : ""}`}>
          {state.analyzeMessage ?? "Analyzing…"}
        </p>
      )}
      {!analyzing &&
        state.analyzeStatus !== "error" &&
        state.analyzeMessage &&
        !track?.mixReady && (
          <p className="analyze-banner cue-status">{state.analyzeMessage}</p>
        )}
      <Waveform
        deckId={id}
        peaks={peaks}
        stems={state.stems}
        position={state.position}
        playing={state.playing}
      />
      <Transport
        playing={state.playing}
        synced={state.synced}
        pitchPercent={state.pitchPercent}
        onPlay={onPlay}
        onCue={onCue}
        onSync={onSync}
        onPitch={onPitch}
      />
    </article>
  );
}
