import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { SetlistItem } from "../types/models";
import { colors } from "../theme/tokens";
import { SourceBadge } from "./TrackBadge";

interface Props {
  items: SetlistItem[];
  onLoad: (trackId: string) => void;
}

export function SetlistStrip({ items, onLoad }: Props) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>AI Setlist</Text>
      <Text style={styles.sub}>Suggested next · mock catalog</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
        {items.map(({ track, reason }) => (
          <Pressable
            key={track.id}
            style={styles.card}
            onPress={() => onLoad(track.id)}
          >
            <Text style={styles.cardTitle} numberOfLines={1}>
              {track.title}
            </Text>
            <Text style={styles.cardArtist}>{track.artist}</Text>
            <View style={styles.meta}>
              <Text style={styles.metaText}>
                {track.bpm} · {track.camelot}
              </Text>
              <SourceBadge source={track.source} />
            </View>
            <Text style={styles.reason}>
              {reason}
              {track.mixReady ? " · mix-ready" : " · cue-only"}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
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
    gap: 4,
  },
  title: { color: colors.white, fontSize: 15, fontWeight: "700" },
  sub: { color: colors.fog, fontSize: 12, marginBottom: 8 },
  strip: { marginHorizontal: -4 },
  card: {
    width: 180,
    backgroundColor: colors.voidElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 12,
    marginRight: 10,
    gap: 4,
  },
  cardTitle: { color: colors.white, fontSize: 13, fontWeight: "650" },
  cardArtist: { color: colors.fog, fontSize: 11 },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaText: { color: colors.fogDim, fontSize: 10, fontFamily: "monospace" },
  reason: { color: colors.violet, fontSize: 10, fontWeight: "600" },
});
