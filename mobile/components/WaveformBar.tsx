import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import type { DeckId, StemGains } from "../types/models";
import { STEM_NAMES } from "../types/models";
import { colors } from "../theme/tokens";

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function peaks(seed: number, bars = 48) {
  const rand = mulberry32(seed);
  return Array.from({ length: bars }, () => 0.2 + rand() * 0.8);
}

interface Props {
  deckId: DeckId;
  seed: number;
  stems: StemGains;
  position: number;
  playing: boolean;
}

export function WaveformBar({ deckId, seed, stems, position, playing }: Props) {
  const data = useMemo(() => peaks(seed), [seed]);
  const accent = deckId === "A" ? colors.lime : colors.violet;
  const gain =
    STEM_NAMES.reduce((s, n) => s + stems[n], 0) / STEM_NAMES.length;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {data.map((h, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: `${Math.max(8, h * gain * 100)}%`,
                backgroundColor: accent,
                opacity: 0.35 + gain * 0.55,
              },
            ]}
          />
        ))}
      </View>
      <View
        style={[
          styles.playhead,
          { left: `${position * 100}%`, backgroundColor: accent },
        ]}
      />
      {playing && <View style={[styles.pulse, { borderColor: accent }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 72,
    backgroundColor: "#0C0C0E",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
    gap: 2,
    paddingHorizontal: 4,
  },
  bar: {
    flex: 1,
    borderRadius: 1,
    alignSelf: "center",
  },
  playhead: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
  },
  pulse: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    opacity: 0.25,
  },
});
