import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DeckId, DeckState, StemName } from "../types/models";
import { STEM_NAMES } from "../types/models";
import { colors } from "../theme/tokens";

interface Props {
  stemTarget: DeckId;
  onStemTarget: (id: DeckId) => void;
  deck: DeckState;
  onStem: (name: StemName, delta: number) => void;
}

export function StemPanel({ stemTarget, onStemTarget, deck, onStem }: Props) {
  const mixReady = Boolean(deck.track?.mixReady);
  const source = deck.track?.source ?? "local";
  const accent = stemTarget === "A" ? colors.lime : colors.violet;

  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <Text style={styles.title}>AI Stems</Text>
        <Text style={styles.sub}>On-device · Vocals / Drums / Bass / Other</Text>
      </View>
      <View style={styles.tabs}>
        {(["A", "B"] as DeckId[]).map((id) => (
          <Pressable
            key={id}
            onPress={() => onStemTarget(id)}
            style={[
              styles.tab,
              stemTarget === id && {
                backgroundColor: id === "A" ? colors.limeDim : colors.violetDim,
                borderColor: id === "A" ? colors.lime : colors.violet,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                stemTarget === id && {
                  color: id === "A" ? colors.lime : colors.violet,
                },
              ]}
            >
              Deck {id}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.faders, !mixReady && { opacity: 0.4 }]}>
        {STEM_NAMES.map((name) => (
          <View key={name} style={styles.faderCol}>
            <Text style={[styles.pct, { color: accent }]}>
              {Math.round(deck.stems[name] * 100)}
            </Text>
            <View style={styles.btnCol}>
              <Pressable
                disabled={!mixReady}
                style={styles.step}
                onPress={() => onStem(name, 0.1)}
              >
                <Text style={{ color: accent }}>+</Text>
              </Pressable>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      height: `${deck.stems[name] * 100}%`,
                      backgroundColor: accent,
                    },
                  ]}
                />
              </View>
              <Pressable
                disabled={!mixReady}
                style={styles.step}
                onPress={() => onStem(name, -0.1)}
              >
                <Text style={{ color: accent }}>−</Text>
              </Pressable>
            </View>
            <Text style={styles.name}>{name}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.note, !mixReady && styles.warn]}>
        {mixReady
          ? `Deck ${stemTarget} is mix-ready — stems active (${source}).`
          : `Deck ${stemTarget} is cue-only (${source} DRM). Split disabled — use Local Mode.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.voidPanel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 14,
    gap: 10,
  },
  head: { gap: 2 },
  title: { color: colors.white, fontSize: 15, fontWeight: "700" },
  sub: { color: colors.fog, fontSize: 12 },
  tabs: { flexDirection: "row", gap: 8 },
  tab: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  tabText: { color: colors.fog, fontSize: 12, fontWeight: "600" },
  faders: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 8 },
  faderCol: { alignItems: "center", gap: 6, width: 64 },
  pct: { fontSize: 11, fontWeight: "700" },
  btnCol: { alignItems: "center", gap: 4 },
  step: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.voidElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    width: 10,
    height: 80,
    borderRadius: 999,
    backgroundColor: "#222228",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  fill: { width: "100%", borderRadius: 999 },
  name: {
    color: colors.fog,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  note: { color: colors.fogDim, fontSize: 12, textAlign: "center" },
  warn: { color: "#ffb4c0" },
});
