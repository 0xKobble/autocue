import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ensureAudio,
  playClick,
  startVoice,
  stopVoice,
  updateVoiceGains,
} from "../audio/audioGraph";
import { generatePeaks, hashStr } from "../audio/waveform";
import { INITIAL_DECK_A, INITIAL_DECK_B, MOCK_CATALOG } from "../data/mockCatalog";
import type { DeckId, DeckState, StemName, Track } from "../types/models";
import { DEFAULT_STEMS } from "../types/models";

function makeDeck(id: DeckId, track: Track, seed: number, baseFreq: number): DeckState {
  return {
    deckId: id,
    track,
    playing: false,
    position: id === "A" ? 0.28 : 0.35,
    pitchPercent: 0,
    synced: false,
    stems: { ...DEFAULT_STEMS },
    seed,
    baseFreq,
  };
}

export function useDeckEngine() {
  const [deckA, setDeckA] = useState<DeckState>(() => makeDeck("A", INITIAL_DECK_A, 42, 220));
  const [deckB, setDeckB] = useState<DeckState>(() => makeDeck("B", INITIAL_DECK_B, 99, 196));
  const [focused, setFocused] = useState<DeckId>("A");
  const [stemTarget, setStemTarget] = useState<DeckId>("A");
  const [crossfade, setCrossfade] = useState(0.5);
  const [aiMode, setAiMode] = useState(true);
  const [harmonicOn, setHarmonicOn] = useState(true);
  const [energyOn, setEnergyOn] = useState(true);
  const [peaksA, setPeaksA] = useState(() => generatePeaks(42));
  const [peaksB, setPeaksB] = useState(() => generatePeaks(99));
  const [meterA, setMeterA] = useState(8);
  const [meterB, setMeterB] = useState(8);

  const crossfadeRef = useRef(crossfade);
  crossfadeRef.current = crossfade;
  const deckARef = useRef(deckA);
  const deckBRef = useRef(deckB);
  deckARef.current = deckA;
  deckBRef.current = deckB;

  const getDeck = useCallback((id: DeckId) => (id === "A" ? deckA : deckB), [deckA, deckB]);
  const setDeck = useCallback((id: DeckId, updater: (d: DeckState) => DeckState) => {
    if (id === "A") setDeckA(updater);
    else setDeckB(updater);
  }, []);

  const syncVoice = useCallback((id: DeckId, d: DeckState, xf: number) => {
    if (!d.track) return;
    updateVoiceGains(id, { playing: d.playing, stems: d.stems, crossfade: xf });
  }, []);

  const togglePlay = useCallback(
    (id: DeckId) => {
      ensureAudio();
      const d = id === "A" ? deckARef.current : deckBRef.current;
      const next = !d.playing;
      setDeck(id, (prev) => ({ ...prev, playing: next }));
      setFocused(id);
      if (next) {
        startVoice(id, {
          playing: true,
          baseFreq: d.baseFreq,
          bpm: d.track?.bpm ?? 128,
          stems: d.stems,
          crossfade: crossfadeRef.current,
        });
        playClick(id === "A" ? 660 : 520, 0.04, 0.08);
      } else {
        stopVoice(id);
      }
    },
    [setDeck]
  );

  const cueDeck = useCallback(
    (id: DeckId) => {
      ensureAudio();
      const d = id === "A" ? deckARef.current : deckBRef.current;
      stopVoice(id);
      setDeck(id, (prev) => ({ ...prev, playing: false, position: 0.12 }));
      playClick(id === "A" ? 990 : 780, 0.06, 0.12);
      startVoice(id, {
        playing: true,
        baseFreq: d.baseFreq,
        bpm: d.track?.bpm ?? 128,
        stems: d.stems,
        crossfade: crossfadeRef.current,
      });
      setDeck(id, (prev) => ({ ...prev, playing: true, position: 0.12 }));
      setFocused(id);
      window.setTimeout(() => {
        stopVoice(id);
        setDeck(id, (prev) => ({ ...prev, playing: false }));
      }, 180);
    },
    [setDeck]
  );

  const toggleSync = useCallback(
    (id: DeckId) => {
      const a = deckARef.current;
      const b = deckBRef.current;
      setDeck(id, (prev) => ({ ...prev, synced: !prev.synced }));
      const bothReady = Boolean(a.track?.mixReady && b.track?.mixReady);
      playClick(bothReady ? 440 : 220, bothReady ? 0.04 : 0.08, bothReady ? 0.06 : 0.05);
    },
    [setDeck]
  );

  const setStem = useCallback(
    (name: StemName, value01: number) => {
      setDeck(stemTarget, (prev) => ({
        ...prev,
        stems: { ...prev.stems, [name]: value01 },
      }));
      const d = stemTarget === "A" ? { ...deckARef.current } : { ...deckBRef.current };
      d.stems = { ...d.stems, [name]: value01 };
      syncVoice(stemTarget, d, crossfadeRef.current);
    },
    [setDeck, stemTarget, syncVoice]
  );

  const loadToDeck = useCallback(
    (id: DeckId, track: Track) => {
      stopVoice(id);
      const seed = hashStr(track.id + track.title);
      setDeck(id, (prev) => ({
        ...prev,
        track,
        playing: false,
        position: 0.2,
        synced: false,
        seed,
        baseFreq: id === "A" ? 220 : 196,
      }));
      if (id === "A") setPeaksA(generatePeaks(seed));
      else setPeaksB(generatePeaks(seed));
      setFocused(id);
      playClick(550, 0.05, 0.1);
    },
    [setDeck]
  );

  const onCrossfade = useCallback(
    (v: number) => {
      setCrossfade(v);
      syncVoice("A", deckARef.current, v);
      syncVoice("B", deckBRef.current, v);
    },
    [syncVoice]
  );

  // Animation loop for playhead + meters
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const a = deckARef.current;
      const b = deckBRef.current;
      if (a.playing) {
        const speed = ((a.track?.bpm ?? 128) / 128) * 0.000035;
        setDeckA((prev) => {
          let pos = prev.position + speed;
          if (pos > 0.92) pos = 0.08;
          return { ...prev, position: pos };
        });
      }
      if (b.playing) {
        const speed = ((b.track?.bpm ?? 128) / 128) * 0.000035;
        setDeckB((prev) => {
          let pos = prev.position + speed;
          if (pos > 0.92) pos = 0.08;
          return { ...prev, position: pos };
        });
      }
      const stemMix = (s: typeof a.stems) => (s.vocals + s.drums + s.bass + s.other) / 4;
      const masterA = Math.cos(crossfadeRef.current * 0.5 * Math.PI);
      const masterB = Math.cos((1 - crossfadeRef.current) * 0.5 * Math.PI);
      setMeterA(a.playing ? 35 + Math.random() * 55 * stemMix(a.stems) * masterA : 8);
      setMeterB(b.playing ? 35 + Math.random() * 55 * stemMix(b.stems) * masterB : 8);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keep voice gains in sync when stems/play change
  useEffect(() => {
    syncVoice("A", deckA, crossfade);
  }, [deckA.playing, deckA.stems, crossfade, syncVoice, deckA]);

  useEffect(() => {
    syncVoice("B", deckB, crossfade);
  }, [deckB.playing, deckB.stems, crossfade, syncVoice, deckB]);

  const setlist = useMemo(() => {
    let items = MOCK_CATALOG.map((t) => {
      let score = t.energy ?? 0.5;
      if (harmonicOn) {
        const ca = deckA.track?.camelot;
        const cb = deckB.track?.camelot;
        if (t.camelot === ca || t.camelot === cb) score += 0.35;
        if (ca && t.camelot?.slice(0, -1) === ca.slice(0, -1)) score += 0.15;
      }
      return {
        track: {
          ...t,
          reason: aiMode ? t.reason : "Manual order",
        },
        reason: aiMode ? (t.reason ?? "") : "Manual order",
        score,
      };
    });
    if (energyOn || harmonicOn) items = items.sort((x, y) => y.score - x.score);
    return items;
  }, [aiMode, harmonicOn, energyOn, deckA.track?.camelot, deckB.track?.camelot]);

  return {
    deckA,
    deckB,
    focused,
    setFocused,
    stemTarget,
    setStemTarget,
    crossfade,
    onCrossfade,
    aiMode,
    setAiMode,
    harmonicOn,
    setHarmonicOn,
    energyOn,
    setEnergyOn,
    peaksA,
    peaksB,
    meterA,
    meterB,
    togglePlay,
    cueDeck,
    toggleSync,
    setStem,
    loadToDeck,
    getDeck,
    setlist,
    catalog: MOCK_CATALOG,
  };
}
