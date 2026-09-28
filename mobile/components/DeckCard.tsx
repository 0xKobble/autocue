import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DeckState } from "../types/models";
import { colors } from "../theme/tokens";
import { TrackBadge } from "./TrackBadge";
import { WaveformBar } from "./WaveformBar";

interface Props {
  state: DeckState;
  focused: boolean;
  onFocus: () => void;
  onPlay: () => void;
  onCue: () => void;
  onSync: () => void;
}

export function DeckCard({
  state,
  focused,
  onFocus,
  onPlay,
  onCue,
  onSync,
}: Props) {
  const id = state.deckId;
  const track = state.track;
  const accent = id === "A" ? colors.lime : colors.violet;
  const accentDim = id === "A" ? colors.limeDim : colors.violetDim;

  return (
    <Pressable
      onPress={onFocus}
      style={[
        styles.card,
        focused && { shadowColor: accent, borderColor: accent + "66" },
      ]}
    >
      <View style={[styles.topLine, { backgroundColor: accent }]} />
      <View style={styles.head}>
        <Text style={[styles.label, { color: accent }]}>Deck {id}</Text>
        {track && <TrackBadge source={track.source} mixReady={track.mixReady} />}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {track?.title ?? "—"}
      </Text>
      <Text style={styles.artist}>{track?.artist ?? ""}</Text>
      <Text style={styles.stats}>
        {track?.bpm ? `${track.bpm} BPM` : "—"} · {track?.camelot ?? "—"} ·{" "}
        {track?.key ?? "—"}
      </Text>
      {!track?.mixReady && track && (
        <Text style={styles.banner}>
          Streaming: cue & browse only. Load Local / Demo for mix & stems.
        </Text>
      )}
      <WaveformBar
        deckId={id}
        seed={state.seed}
        stems={state.stems}
        position={state.position}
        playing={state.playing}
      />
      <View style={styles.transport}>
        <Pressable style={styles.smallBtn} onPress={onCue}>
          <Text style={styles.smallBtnText}>CUE</Text>
        </Pressable>
        <Pressable
          style={[
            styles.playBtn,
            { backgroundColor: accentDim, borderColor: accent },
            state.playing && { backgroundColor: accent },
          ]}
          onPress={onPlay}
        >
          <Text
            style={[
              styles.playIcon,
              { color: state.playing ? colors.void : accent },
            ]}
          >
            {state.playing ? "❚❚" : "▶"}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.smallBtn, state.synced && { borderColor: accent }]}
          onPress={onSync}
        >
          <Text
            style={[styles.smallBtnText, state.synced && { color: accent }]}
          >
            SYNC
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.voidPanel,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 8,
    overflow: "hidden",
  },
  topLine: { position: "absolute", top: 0, left: 0, right: 0, height: 2 },
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  artist: { color: colors.fog, fontSize: 14 },
  stats: { color: colors.fogDim, fontSize: 11, fontFamily: "monospace" },
  banner: {
    color: "#ffb4c0",
    fontSize: 11,
    backgroundColor: "rgba(255,92,122,0.1)",
    padding: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  transport: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 4,
  },
  smallBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.voidElevated,
  },
  smallBtnText: {
    color: colors.fog,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  playBtn: {
    width: 52,
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: { fontSize: 16, fontWeight: "700" },
});
