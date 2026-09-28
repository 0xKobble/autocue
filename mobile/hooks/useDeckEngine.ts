import { useCallback, useMemo, useState } from "react";
import {
  INITIAL_DECK_A,
  INITIAL_DECK_B,
  MOCK_CATALOG,
} from "../data/mockCatalog";
import type { DeckId, DeckState, StemName, Track } from "../types/models";
import { DEFAULT_STEMS } from "../types/models";

function makeDeck(id: DeckId, track: Track, seed: number): DeckState {
  return {
    deckId: id,
    track,
    playing: false,
    position: id === "A" ? 0.28 : 0.35,
    pitchPercent: 0,
    synced: false,
    stems: { ...DEFAULT_STEMS },
    seed,
    baseFreq: id === "A" ? 220 : 196,
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

export function useDeckEngine() {
  const [deckA, setDeckA] = useState(() => makeDeck("A", INITIAL_DECK_A, 42));
  const [deckB, setDeckB] = useState(() => makeDeck("B", INITIAL_DECK_B, 99));
  const [focused, setFocused] = useState<DeckId>("A");
  const [stemTarget, setStemTarget] = useState<DeckId>("A");
  const [crossfade, setCrossfade] = useState(0.5);

  const setDeck = useCallback((id: DeckId, updater: (d: DeckState) => DeckState) => {
    if (id === "A") setDeckA(updater);
    else setDeckB(updater);
  }, []);

  const togglePlay = useCallback(
    (id: DeckId) => {
      setDeck(id, (p) => ({ ...p, playing: !p.playing }));
      setFocused(id);
    },
    [setDeck]
  );

  const cueDeck = useCallback(
    (id: DeckId) => {
      setDeck(id, (p) => ({ ...p, playing: false, position: 0.12 }));
      setFocused(id);
    },
    [setDeck]
  );

  const toggleSync = useCallback(
    (id: DeckId) => {
      setDeck(id, (p) => ({ ...p, synced: !p.synced }));
    },
    [setDeck]
  );

  const setStem = useCallback(
    (name: StemName, delta: number) => {
      setDeck(stemTarget, (p) => ({
        ...p,
        stems: {
          ...p.stems,
          [name]: Math.max(0, Math.min(1, p.stems[name] + delta)),
        },
      }));
    },
    [setDeck, stemTarget]
  );

  const loadToDeck = useCallback(
    (id: DeckId, track: Track) => {
      const seed = hashStr(track.id + track.title);
      setDeck(id, (p) => ({
        ...p,
        track,
        playing: false,
        position: 0.2,
        synced: false,
        seed,
      }));
      setFocused(id);
    },
    [setDeck]
  );

  const setlist = useMemo(() => {
    return MOCK_CATALOG.map((t) => {
      let score = t.energy ?? 0.5;
      const ca = deckA.track?.camelot;
      if (t.camelot === ca || t.camelot === deckB.track?.camelot) score += 0.35;
      return { track: t, reason: t.reason ?? "", score };
    }).sort((a, b) => b.score - a.score);
  }, [deckA.track?.camelot, deckB.track?.camelot]);

  return {
    deckA,
    deckB,
    focused,
    setFocused,
    stemTarget,
    setStemTarget,
    crossfade,
    setCrossfade,
    togglePlay,
    cueDeck,
    toggleSync,
    setStem,
    loadToDeck,
    setlist,
    catalog: MOCK_CATALOG,
  };
}
