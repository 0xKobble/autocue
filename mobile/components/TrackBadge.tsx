import { StyleSheet, Text, View } from "react-native";
import type { SourceKind } from "../types/models";
import { colors } from "../theme/tokens";

export function TrackBadge({
  source,
  mixReady,
}: {
  source: SourceKind;
  mixReady: boolean;
}) {
  let label = mixReady ? "Mix-ready · Local" : "Cue-only";
  let style = styles.local;
  if (source === "spotify") {
    label = "Cue-only · Spotify";
    style = styles.spotify;
  } else if (source === "apple") {
    label = "Cue-only · Apple";
    style = styles.apple;
  } else if (source === "youtube") {
    cls = "badge badge-youtube";
    label = "Cue-only · YouTube Music";
  } else if (source === "soundcloud") {
    cls = "badge badge-soundcloud";
    label = mixReady ? "Mix-ready · SC" : "Cue-only · SoundCloud";
  } else if (source === "demo") {
    label = mixReady ? "Mix-ready · Demo" : "Cue-only · Demo";
    style = styles.local;
  } else if (source === "local") {
    label = mixReady ? "Mix-ready · Local" : "Cue-only · Local";
    style = styles.local;
  }
  return (
    <View style={[styles.badge, style]}>
      <Text style={[styles.text, style]}>{label}</Text>
    </View>
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
  const style =
    source === "spotify"
      ? styles.spotify
      : source === "apple"
        ? styles.apple
        : styles.local;
  return (
    <View style={[styles.sourceBadge, style]}>
      <Text style={[styles.sourceText, style]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: { fontSize: 10, fontWeight: "600" },
  local: {
    backgroundColor: colors.limeDim,
    borderColor: "rgba(184,255,60,0.35)",
    color: colors.lime,
  },
  spotify: {
    backgroundColor: "rgba(29,185,84,0.12)",
    borderColor: "rgba(29,185,84,0.35)",
    color: "#7dffb0",
  },
  apple: {
    backgroundColor: "rgba(252,60,68,0.12)",
    borderColor: "rgba(252,60,68,0.35)",
    color: "#ff8a90",
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  sourceText: { fontSize: 9, fontWeight: "700" },
});
