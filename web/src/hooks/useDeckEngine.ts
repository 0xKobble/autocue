import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyGains,
  clearDeckAudio,
  ensureAudio,
  getDeckPosition01,
  loadStemBuffers,
  peaksFromBuffers,
  playClick,
  setPitch,
  startDeck,
  stopDeck,
} from "../audio/audioGraph";
import {
  bandSplitBuffer,
  buildDemoStemPack,
  decodeAudioFile,
  stemModeLabel,
} from "../audio/stemEngine";
import { generatePeaks, hashStr } from "../audio/waveform";
import { INITIAL_DECK_A, INITIAL_DECK_B, MOCK_CATALOG } from "../data/mockCatalog";
import {
  getYtmLibrarySnapshot,
  type YtmLibraryMode,
  type YtmLibrarySnapshot,
} from "../data/ytmLibrary";
import {
  getScLibrarySnapshot,
  SC_ALL_TRACKS,
  type ScLibrarySnapshot,
} from "../data/soundcloudLibrary";
import {
  fetchYoutubeLibrary,
  hasGoogleClientId,
  requestGoogleAccessToken,
  revokeGoogleToken,
} from "../auth/googleYoutube";
import type {
  DeckId,
  DeckState,
  StemName,
  Track,
} from "../types/models";
import {
  DEFAULT_MUTES,
  DEFAULT_SOLOS,
  DEFAULT_STEMS,
} from "../types/models";
import type { SourceFlags } from "../components/SourcesPanel";

function makeDeck(id: DeckId, track: Track, seed: number, baseFreq: number): DeckState {
  return {
    deckId: id,
    track,
    playing: false,
    position: id === "A" ? 0.28 : 0.35,
    pitchPercent: 0,
    synced: false,
    stems: { ...DEFAULT_STEMS },
    mutes: { ...DEFAULT_MUTES },
    solos: { ...DEFAULT_SOLOS },
    seed,
    baseFreq,
    stemMode: track.mixReady ? "demo-stems" : "oscillator",
    analyzeStatus: "idle",
  };
}

function gainsOf(d: DeckState, crossfade: number) {
  return {
    mixReady: Boolean(d.track?.mixReady),
    baseFreq: d.baseFreq,
    bpm: d.track?.bpm ?? 128,
    stems: d.stems,
    mutes: d.mutes,
    solos: d.solos,
    crossfade,
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
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [sources, setSources] = useState<SourceFlags>({
    local: true,
    soundcloud: false,
    youtube: false,
    spotify: true,
    apple: true,
  });
  const [scConnecting, setScConnecting] = useState(false);
  const [ytmConnecting, setYtmConnecting] = useState(false);
  const [ytmError, setYtmError] = useState<string | null>(null);
  const [ytmMode, setYtmMode] = useState<YtmLibraryMode>("demo");
  const [ytmLibrary, setYtmLibrary] = useState<YtmLibrarySnapshot | null>(null);
  const [scLibrary, setScLibrary] = useState<ScLibrarySnapshot | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [globalAnalyzing, setGlobalAnalyzing] = useState(false);

  const crossfadeRef = useRef(crossfade);
  crossfadeRef.current = crossfade;
  const deckARef = useRef(deckA);
  const deckBRef = useRef(deckB);
  deckARef.current = deckA;
  deckBRef.current = deckB;
  const fileUrlsRef = useRef<Map<string, string>>(new Map());

  const setDeck = useCallback((id: DeckId, updater: (d: DeckState) => DeckState) => {
    if (id === "A") setDeckA(updater);
    else setDeckB(updater);
  }, []);

  const syncGains = useCallback((id: DeckId, d: DeckState, xf: number) => {
    applyGains(id, {
      playing: d.playing,
      stems: d.stems,
      mutes: d.mutes,
      solos: d.solos,
      crossfade: xf,
    });
  }, []);

  const prepareMixReady = useCallback(
    async (id: DeckId, track: Track) => {
      ensureAudio();
      setDeck(id, (prev) => ({
        ...prev,
        analyzeStatus: "decoding",
        analyzeMessage: "Decoding…",
      }));
      setGlobalAnalyzing(true);
      try {
        let result;
        if (track.source === "demo" || (track.source === "soundcloud" && track.downloadable && !track.localUri)) {
          setDeck(id, (prev) => ({
            ...prev,
            analyzeStatus: "splitting",
            analyzeMessage: "Building demo stems…",
          }));
          result = await buildDemoStemPack(
            Math.min(45, (track.durationMs || 300000) / 1000),
            track.bpm ?? 128,
            hashStr(track.id)
          );
        } else if (track.localUri) {
          setDeck(id, (prev) => ({
            ...prev,
            analyzeStatus: "decoding",
            analyzeMessage: "Decoding local file…",
          }));
          const res = await fetch(track.localUri);
          const ab = await res.arrayBuffer();
          const buf = await decodeAudioFile(ab);
          setDeck(id, (prev) => ({
            ...prev,
            analyzeStatus: "splitting",
            analyzeMessage: "Band-splitting preview stems…",
          }));
          result = await bandSplitBuffer(buf);
        } else if (track.source === "local" || track.mixReady) {
          // catalog placeholder without file — demo stems so faders still work
          result = await buildDemoStemPack(30, track.bpm ?? 128, hashStr(track.id));
        } else {
          clearDeckAudio(id);
          setDeck(id, (prev) => ({
            ...prev,
            stemMode: "oscillator",
            analyzeStatus: "idle",
            analyzeMessage: undefined,
          }));
          setGlobalAnalyzing(false);
          return;
        }

        loadStemBuffers(id, result.buffers, result.mode, result.durationSec);
        const peaks = peaksFromBuffers(result.buffers);
        if (id === "A") setPeaksA(peaks);
        else setPeaksB(peaks);
        setDeck(id, (prev) => ({
          ...prev,
          stemMode: result.mode,
          analyzeStatus: "ready",
          analyzeMessage: stemModeLabel(result.mode),
          track: prev.track
            ? { ...prev.track, durationMs: Math.round(result.durationSec * 1000) }
            : prev.track,
        }));
      } catch (err) {
        console.error(err);
        setDeck(id, (prev) => ({
          ...prev,
          analyzeStatus: "error",
          analyzeMessage: "Analyze failed — falling back to cue tone",
          stemMode: "oscillator",
        }));
        clearDeckAudio(id);
      } finally {
        setGlobalAnalyzing(false);
      }
    },
    [setDeck]
  );

  // Boot Deck A with demo stems
  useEffect(() => {
    void prepareMixReady("A", INITIAL_DECK_A);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlay = useCallback(
    (id: DeckId) => {
      ensureAudio();
      const d = id === "A" ? deckARef.current : deckBRef.current;
      const next = !d.playing;
      setDeck(id, (prev) => ({ ...prev, playing: next }));
      setFocused(id);
      if (next) {
        startDeck(id, { ...gainsOf(d, crossfadeRef.current), offset01: d.position });
        playClick(id === "A" ? 660 : 520, 0.04, 0.08);
      } else {
        stopDeck(id);
      }
    },
    [setDeck]
  );

  const cueDeck = useCallback(
    (id: DeckId) => {
      ensureAudio();
      const d = id === "A" ? deckARef.current : deckBRef.current;
      stopDeck(id);
      const cuePos = 0.12;
      setDeck(id, (prev) => ({ ...prev, playing: false, position: cuePos }));
      playClick(id === "A" ? 990 : 780, 0.06, 0.12);
      startDeck(id, { ...gainsOf({ ...d, position: cuePos }, crossfadeRef.current), offset01: cuePos });
      setDeck(id, (prev) => ({ ...prev, playing: true, position: cuePos }));
      setFocused(id);
      window.setTimeout(() => {
        stopDeck(id);
        setDeck(id, (prev) => ({ ...prev, playing: false }));
      }, 220);
    },
    [setDeck]
  );

  const toggleSync = useCallback(
    (id: DeckId) => {
      const a = deckARef.current;
      const b = deckBRef.current;
      const other = id === "A" ? b : a;
      const self = id === "A" ? a : b;
      const bothReady = Boolean(a.track?.mixReady && b.track?.mixReady);
      setDeck(id, (prev) => {
        const synced = !prev.synced;
        if (synced && bothReady && other.track?.bpm && self.track?.bpm) {
          const targetBpm = other.track.bpm;
          const pitch = ((targetBpm / self.track.bpm) - 1) * 100;
          const clamped = Math.max(-8, Math.min(8, pitch));
          setPitch(id, clamped);
          return { ...prev, synced: true, pitchPercent: clamped };
        }
        return { ...prev, synced };
      });
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
      syncGains(stemTarget, d, crossfadeRef.current);
    },
    [setDeck, stemTarget, syncGains]
  );

  const toggleMute = useCallback(
    (name: StemName) => {
      setDeck(stemTarget, (prev) => {
        const mutes = { ...prev.mutes, [name]: !prev.mutes[name] };
        const next = { ...prev, mutes };
        syncGains(stemTarget, next, crossfadeRef.current);
        return next;
      });
    },
    [setDeck, stemTarget, syncGains]
  );

  const toggleSolo = useCallback(
    (name: StemName) => {
      setDeck(stemTarget, (prev) => {
        const solos = { ...prev.solos, [name]: !prev.solos[name] };
        const next = { ...prev, solos };
        syncGains(stemTarget, next, crossfadeRef.current);
        return next;
      });
    },
    [setDeck, stemTarget, syncGains]
  );

  const setPitchPercent = useCallback(
    (id: DeckId, pitchPercent: number) => {
      setPitch(id, pitchPercent);
      setDeck(id, (prev) => ({ ...prev, pitchPercent, synced: false }));
    },
    [setDeck]
  );

  const loadToDeck = useCallback(
    (id: DeckId, track: Track) => {
      stopDeck(id);
      clearDeckAudio(id);
      const seed = hashStr(track.id + track.title);
      setDeck(id, (prev) => ({
        ...prev,
        track,
        playing: false,
        position: 0.08,
        synced: false,
        pitchPercent: 0,
        seed,
        baseFreq: id === "A" ? 220 : 196,
        stems: { ...DEFAULT_STEMS },
        mutes: { ...DEFAULT_MUTES },
        solos: { ...DEFAULT_SOLOS },
        stemMode: track.mixReady ? "none" : "oscillator",
        analyzeStatus: track.mixReady ? "decoding" : "idle",
        analyzeMessage: track.mixReady ? "Preparing…" : "Cue-only · streaming",
      }));
      if (!track.mixReady) {
        if (id === "A") setPeaksA(generatePeaks(seed));
        else setPeaksB(generatePeaks(seed));
      }
      setFocused(id);
      playClick(550, 0.05, 0.1);
      if (track.mixReady) void prepareMixReady(id, track);
    },
    [setDeck, prepareMixReady]
  );

  const onCrossfade = useCallback(
    (v: number) => {
      setCrossfade(v);
      syncGains("A", deckARef.current, v);
      syncGains("B", deckBRef.current, v);
    },
    [syncGains]
  );

  const toggleSource = useCallback((id: keyof SourceFlags) => {
    setSources((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const connectSoundCloud = useCallback(() => {
    setScConnecting(true);
    window.setTimeout(() => {
      setScLibrary(getScLibrarySnapshot());
      setSources((prev) => ({ ...prev, soundcloud: true }));
      setScConnecting(false);
    }, 700);
  }, []);

  const disconnectSoundCloud = useCallback(() => {
    setSources((prev) => ({ ...prev, soundcloud: false }));
    setScLibrary(null);
  }, []);

  const connectYouTube = useCallback(async () => {
    setYtmConnecting(true);
    setYtmError(null);
    try {
      if (hasGoogleClientId()) {
        const token = await requestGoogleAccessToken();
        setGoogleToken(token);
        const lib = await fetchYoutubeLibrary(token);
        setYtmLibrary(lib);
        setYtmMode("google");
        setSources((prev) => ({ ...prev, youtube: true }));
      } else {
        await new Promise((r) => window.setTimeout(r, 650));
        setYtmLibrary(getYtmLibrarySnapshot());
        setYtmMode("demo");
        setGoogleToken(null);
        setSources((prev) => ({ ...prev, youtube: true }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "YouTube connect failed";
      setYtmError(msg);
      // Fall back to demo library so Connect still feels usable
      setYtmLibrary(getYtmLibrarySnapshot());
      setYtmMode("demo");
      setSources((prev) => ({ ...prev, youtube: true }));
    } finally {
      setYtmConnecting(false);
    }
  }, []);

  const disconnectYouTube = useCallback(() => {
    if (googleToken) revokeGoogleToken(googleToken);
    setGoogleToken(null);
    setYtmLibrary(null);
    setYtmMode("demo");
    setYtmError(null);
    setSources((prev) => ({ ...prev, youtube: false }));
  }, [googleToken]);

  const importLocalFiles = useCallback(
    async (files: FileList) => {
      ensureAudio();
      setSources((prev) => ({ ...prev, local: true }));
      const added: Track[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("audio/") && !/\.(mp3|wav|m4a|flac|ogg)$/i.test(file.name)) {
          continue;
        }
        const url = URL.createObjectURL(file);
        const id = `local-${hashStr(file.name + file.size + file.lastModified)}`;
        fileUrlsRef.current.set(id, url);
        const track: Track = {
          id,
          title: file.name.replace(/\.[^.]+$/, ""),
          artist: "Local file",
          durationMs: 0,
          bpm: 128,
          camelot: "8A",
          key: "Am",
          source: "local",
          mixReady: true,
          localUri: url,
          reason: "Local upload · mix-ready",
          energy: 0.75,
        };
        added.push(track);
      }
      if (!added.length) return;
      setLocalTracks((prev) => [...added, ...prev]);
      // auto-load first into focused deck
      loadToDeck(focused, added[0]);
    },
    [focused, loadToDeck]
  );

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const a = deckARef.current;
      const b = deckBRef.current;
      if (a.playing) {
        const pos = a.track?.mixReady ? getDeckPosition01("A") : (a.position + 0.000035 * ((a.track?.bpm ?? 128) / 128) * (1 + a.pitchPercent / 100));
        setDeckA((prev) => ({
          ...prev,
          position: prev.track?.mixReady ? pos : pos > 0.92 ? 0.08 : pos,
        }));
      }
      if (b.playing) {
        const pos = b.track?.mixReady ? getDeckPosition01("B") : (b.position + 0.000035 * ((b.track?.bpm ?? 128) / 128) * (1 + b.pitchPercent / 100));
        setDeckB((prev) => ({
          ...prev,
          position: prev.track?.mixReady ? pos : pos > 0.92 ? 0.08 : pos,
        }));
      }
      const stemMix = (s: typeof a.stems, m: typeof a.mutes, so: typeof a.solos) => {
        const names = ["vocals", "drums", "bass", "other"] as StemName[];
        const anySolo = names.some((n) => so[n]);
        let sum = 0;
        let n = 0;
        for (const name of names) {
          if (m[name]) continue;
          if (anySolo && !so[name]) continue;
          sum += s[name];
          n++;
        }
        return n ? sum / n : 0;
      };
      const masterA = Math.cos(crossfadeRef.current * 0.5 * Math.PI);
      const masterB = Math.cos((1 - crossfadeRef.current) * 0.5 * Math.PI);
      setMeterA(a.playing ? 35 + Math.random() * 55 * stemMix(a.stems, a.mutes, a.solos) * masterA : 8);
      setMeterB(b.playing ? 35 + Math.random() * 55 * stemMix(b.stems, b.mutes, b.solos) * masterB : 8);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    syncGains("A", deckA, crossfade);
  }, [deckA.playing, deckA.stems, deckA.mutes, deckA.solos, crossfade, syncGains, deckA]);

  useEffect(() => {
    syncGains("B", deckB, crossfade);
  }, [deckB.playing, deckB.stems, deckB.mutes, deckB.solos, crossfade, syncGains, deckB]);

  const catalog = useMemo(() => {
    const base = [...localTracks, ...MOCK_CATALOG];
    const ids = new Set(base.map((t) => t.id));
    if (sources.youtube && ytmLibrary) {
      for (const t of ytmLibrary.library) {
        if (!ids.has(t.id)) {
          base.push(t);
          ids.add(t.id);
        }
      }
      for (const tracks of Object.values(ytmLibrary.playlistTracks)) {
        for (const t of tracks) {
          if (!ids.has(t.id)) {
            base.push(t);
            ids.add(t.id);
          }
        }
      }
    }
    if (sources.soundcloud) {
      const scTracks = scLibrary?.stream ?? SC_ALL_TRACKS;
      for (const t of scTracks) {
        if (!ids.has(t.id)) {
          base.push(t);
          ids.add(t.id);
        }
      }
    }
    return base;
  }, [localTracks, sources.youtube, sources.soundcloud, ytmLibrary, scLibrary]);

  const setlist = useMemo(() => {
    let items = catalog
      .filter((t) => {
        if (t.source === "demo") return true;
        if (t.source === "local") return sources.local;
        if (t.source === "soundcloud") return sources.soundcloud;
        if (t.source === "youtube") return sources.youtube;
        if (t.source === "spotify") return sources.spotify;
        if (t.source === "apple") return sources.apple;
        return true;
      })
      .map((t) => {
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
  }, [
    catalog,
    sources,
    aiMode,
    harmonicOn,
    energyOn,
    deckA.track?.camelot,
    deckB.track?.camelot,
  ]);

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
    toggleMute,
    toggleSolo,
    setPitchPercent,
    loadToDeck,
    setlist,
    catalog,
    sources,
    toggleSource,
    connectSoundCloud,
    disconnectSoundCloud,
    connectYouTube,
    disconnectYouTube,
    scConnecting,
    ytmConnecting,
    ytmError,
    ytmMode,
    ytmLibrary,
    scLibrary,
    importLocalFiles,
    globalAnalyzing,
  };
}
