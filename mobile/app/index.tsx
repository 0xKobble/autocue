import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DeckCard } from "../components/DeckCard";
import { SetlistStrip } from "../components/SetlistStrip";
import { StemPanel } from "../components/StemPanel";
import { useDeckEngine } from "../hooks/useDeckEngine";
import { colors, TAGLINE } from "../theme/tokens";

export default function DeckScreen() {
  const engine = useDeckEngine();
  const stemDeck = engine.stemTarget === "A" ? engine.deckA : engine.deckB;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <Text style={styles.wordmark}>Autocue</Text>
          <Text style={styles.tagline}>{TAGLINE}</Text>
          <Link href="/library" asChild>
            <Pressable style={styles.libBtn}>
              <Text style={styles.libBtnText}>Library</Text>
            </Pressable>
          </Link>
        </View>

        <DeckCard
          state={engine.deckA}
          focused={engine.focused === "A"}
          onFocus={() => engine.setFocused("A")}
          onPlay={() => engine.togglePlay("A")}
          onCue={() => engine.cueDeck("A")}
          onSync={() => engine.toggleSync("A")}
        />

        <View style={styles.xf}>
          <Text style={styles.xfLabel}>Crossfader</Text>
          <View style={styles.xfTrack}>
            <View
              style={[
                styles.xfThumb,
                { left: `${engine.crossfade * 100}%` },
              ]}
            />
          </View>
          <View style={styles.xfEnds}>
            <Text style={{ color: colors.lime, fontWeight: "700" }}>A</Text>
            <Text style={{ color: colors.violet, fontWeight: "700" }}>B</Text>
          </View>
          <View style={styles.xfBtns}>
            <Pressable
              style={styles.xfBtn}
              onPress={() =>
                engine.setCrossfade(Math.max(0, engine.crossfade - 0.1))
              }
            >
              <Text style={styles.xfBtnText}>← A</Text>
            </Pressable>
            <Pressable
              style={styles.xfBtn}
              onPress={() => engine.setCrossfade(0.5)}
            >
              <Text style={styles.xfBtnText}>Center</Text>
            </Pressable>
            <Pressable
              style={styles.xfBtn}
              onPress={() =>
                engine.setCrossfade(Math.min(1, engine.crossfade + 0.1))
              }
            >
              <Text style={styles.xfBtnText}>B →</Text>
            </Pressable>
          </View>
        </View>

        <DeckCard
          state={engine.deckB}
          focused={engine.focused === "B"}
          onFocus={() => engine.setFocused("B")}
          onPlay={() => engine.togglePlay("B")}
          onCue={() => engine.cueDeck("B")}
          onSync={() => engine.toggleSync("B")}
        />

        <StemPanel
          stemTarget={engine.stemTarget}
          onStemTarget={engine.setStemTarget}
          deck={stemDeck}
          onStem={engine.setStem}
        />

        <SetlistStrip
          items={engine.setlist}
          onLoad={(id) => {
            const t = engine.catalog.find((x) => x.id === id);
            if (t) engine.loadToDeck(engine.focused, t);
          }}
        />

        <Text style={styles.footer}>
          Mobile · mock data · no real Spotify/Apple DRM mixing
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.void },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  brand: { gap: 4, marginBottom: 4 },
  wordmark: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.white,
  },
  tagline: { color: colors.fog, fontSize: 12, letterSpacing: 0.5 },
  libBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.violet,
    backgroundColor: colors.violetDim,
  },
  libBtnText: { color: colors.violet, fontWeight: "650", fontSize: 12 },
  xf: {
    backgroundColor: colors.voidPanel,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 8,
  },
  xfLabel: {
    color: colors.fogDim,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    textAlign: "center",
  },
  xfTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#333",
    overflow: "visible",
    justifyContent: "center",
  },
  xfThumb: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
    marginLeft: -9,
    borderWidth: 2,
    borderColor: colors.void,
  },
  xfEnds: { flexDirection: "row", justifyContent: "space-between" },
  xfBtns: { flexDirection: "row", justifyContent: "center", gap: 10 },
  xfBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.voidElevated,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  xfBtnText: { color: colors.fog, fontSize: 11, fontWeight: "600" },
  footer: {
    color: colors.fogDim,
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
  },
});
