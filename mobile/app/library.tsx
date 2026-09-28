import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { MOCK_CATALOG } from "../data/mockCatalog";
import { SourceBadge, TrackBadge } from "../components/TrackBadge";
import { colors } from "../theme/tokens";

export default function LibraryScreen() {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Text style={styles.note}>
        Mock catalog only. Streaming tracks are cue-only; Local / Demo are
        mix-ready. No real Spotify/Apple DRM streams.
      </Text>
      <FlatList
        data={MOCK_CATALOG}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ gap: 10, padding: 16 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.back()}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.artist}>{item.artist}</Text>
              <Text style={styles.meta}>
                {item.bpm} BPM · {item.camelot}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <SourceBadge source={item.source} />
              <TrackBadge source={item.source} mixReady={item.mixReady} />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.void },
  note: {
    color: colors.fog,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    backgroundColor: colors.voidPanel,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 12,
  },
  title: { color: colors.white, fontWeight: "700", fontSize: 15 },
  artist: { color: colors.fog, fontSize: 13 },
  meta: { color: colors.fogDim, fontSize: 11, fontFamily: "monospace" },
});
