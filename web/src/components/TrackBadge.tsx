import type { SourceKind } from "../types/models";

interface Props {
  source: SourceKind;
  mixReady: boolean;
}

export function TrackBadge({ source, mixReady }: Props) {
  let cls = "badge badge-local";
  let label = mixReady ? "Mix-ready · Local" : "Cue-only";

  if (source === "spotify") {
    cls = "badge badge-spotify";
    label = "Cue-only · Spotify";
  } else if (source === "apple") {
    cls = "badge badge-apple";
    label = "Cue-only · Apple";
  } else if (source === "youtube") {
    cls = "badge badge-youtube";
    label = "Cue-only · YouTube Music";
  } else if (source === "soundcloud") {
    cls = mixReady ? "badge badge-local" : "badge badge-soundcloud";
    label = mixReady ? "Mix-ready · SC download" : "Cue-only · SoundCloud";
  } else if (source === "demo") {
    cls = "badge badge-local";
    label = mixReady ? "Mix-ready · Demo" : "Cue-only · Demo";
  } else if (source === "local") {
    cls = "badge badge-local";
    label = mixReady ? "Mix-ready · Local" : "Cue-only · Local";
  }

  return (
    <span className={cls} data-ready={String(mixReady)}>
      {label}
    </span>
  );
}

export function SourceBadge({ source }: { source: SourceKind }) {
  const label =
    source === "spotify"
      ? "Spotify"
      : source === "apple"
        ? "Apple"
        : source === "youtube"
          ? "YT Music"
          : source === "soundcloud"
            ? "SoundCloud"
            : source === "demo"
              ? "Demo"
              : "Local";
  return <span className={`source-badge ${source}`}>{label}</span>;
}
