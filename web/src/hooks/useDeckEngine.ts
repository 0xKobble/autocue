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
import {
  clearYoutubeCue,
  getYoutubeCueDurationSec,
  getYoutubeCuePosition01,
  loadYoutubeCue,
  pauseYoutubeCue,
  playYoutubeCue,
  seekYoutubeCue,
  setYoutubeCueErrorHandler,
  setYoutubeCueStateHandler,
  setYoutubeCueVolume,
  youtubeVideoIdOf,
} from "../audio/youtubeCuePlayer";
import {
  clearSoundcloudCue,
  getSoundcloudCueDurationSec,
  getSoundcloudCuePosition01,
  loadSoundcloudCue,
  pauseSoundcloudCue,
  playSoundcloudCue,
  seekSoundcloudCue,
  setSoundcloudCueErrorHandler,
  setSoundcloudCueStateHandler,
  setSoundcloudCueVolume,
  soundcloudCueUrlOf,
} from "../audio/soundcloudCuePlayer";
import {
  animateValue,
  deckXfVolume,
  DEFAULT_TRANSITION_MS,
  isStreamCueTrack,
} from "../audio/streamCueMix";
import { generatePeaks, hashStr } from "../audio/waveform";
import { INITIAL_DECK_A, INITIAL_DECK_B, MOCK_CATALOG } from "../data/mockCatalog";
import {
  type YtmLibraryMode,
  type YtmLibrarySnapshot,
} from "../data/ytmLibrary";
import {
  type ScLibraryMode,
  type ScLibrarySnapshot,
} from "../data/soundcloudLibrary";
import {
  fetchYoutubeLibrary,
  hasGoogleClientId,
  requestGoogleAccessToken,
  revokeGoogleToken,
} from "../auth/googleYoutube";
import {
  beginSoundCloudOAuth,
  clearPendingSoundCloudCallback,
  exchangeSoundCloudCode,
  fetchSoundCloudLibrary,
  hasSoundCloudClientId,
  revokeSoundCloudToken,
  takeSoundCloudCallback,
} from "../auth/soundcloud";
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

function syncYoutubeVolumes(crossfade: number, a: DeckState, b: DeckState) {
  if (youtubeVideoIdOf(a.track)) {
    setYoutubeCueVolume("A", a.playing ? deckXfVolume("A", crossfade) : 0);
  }
  if (youtubeVideoIdOf(b.track)) {
    setYoutubeCueVolume("B", b.playing ? deckXfVolume("B", crossfade) : 0);
  }
}

function syncSoundcloudVolumes(crossfade: number, a: DeckState, b: DeckState) {
  if (soundcloudCueUrlOf(a.track)) {
    setSoundcloudCueVolume("A", a.playing ? deckXfVolume("A", crossfade) : 0);
  }
  if (soundcloudCueUrlOf(b.track)) {
    setSoundcloudCueVolume("B", b.playing ? deckXfVolume("B", crossfade) : 0);
  }
}

function syncStreamCueVolumes(crossfade: number, a: DeckState, b: DeckState) {
  syncYoutubeVolumes(crossfade, a, b);
  syncSoundcloudVolumes(crossfade, a, b);
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
  const [scError, setScError] = useState<string | null>(null);
  const [ytmMode, setYtmMode] = useState<YtmLibraryMode>("none");
  const [scMode, setScMode] = useState<ScLibraryMode>("none");
  const [ytmLibrary, setYtmLibrary] = useState<YtmLibrarySnapshot | null>(null);
  const [scLibrary, setScLibrary] = useState<ScLibrarySnapshot | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [scToken, setScToken] = useState<string | null>(null);
  const [globalAnalyzing, setGlobalAnalyzing] = useState(false);
  /** Live listening: auto-play + blend XF when loading a stream cue onto the other deck. */
  const [autoTransition, setAutoTransition] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  const crossfadeRef = useRef(crossfade);
  crossfadeRef.current = crossfade;
  const deckARef = useRef(deckA);
  const deckBRef = useRef(deckB);
  deckARef.current = deckA;
  deckBRef.current = deckB;
  const fileUrlsRef = useRef<Map<string, string>>(new Map());
  const xfAnimStopRef = useRef<(() => void) | null>(null);
  const autoTransitionRef = useRef(autoTransition);
  autoTransitionRef.current = autoTransition;

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

  // YouTube / SoundCloud embed ↔ deck playing / error bridge
  useEffect(() => {
    setYoutubeCueErrorHandler((id, message) => {
      setDeck(id, (prev) => ({
        ...prev,
        playing: false,
        analyzeStatus: "error",
        analyzeMessage: message,
      }));
    });
    setYoutubeCueStateHandler((id, playing) => {
      const d = id === "A" ? deckARef.current : deckBRef.current;
      if (!youtubeVideoIdOf(d.track)) return;
      setDeck(id, (prev) => (prev.playing === playing ? prev : { ...prev, playing }));
      if (playing) {
        setYoutubeCueVolume(id, deckXfVolume(id, crossfadeRef.current));
      }
    });
    setSoundcloudCueErrorHandler((id, message) => {
      setDeck(id, (prev) => ({
        ...prev,
        playing: false,
        analyzeStatus: "error",
        analyzeMessage: message,
      }));
    });
    setSoundcloudCueStateHandler((id, playing) => {
      const d = id === "A" ? deckARef.current : deckBRef.current;
      if (!soundcloudCueUrlOf(d.track)) return;
      setDeck(id, (prev) => (prev.playing === playing ? prev : { ...prev, playing }));
      if (playing) {
        setSoundcloudCueVolume(id, deckXfVolume(id, crossfadeRef.current));
      }
    });
    return () => {
      setYoutubeCueErrorHandler(null);
      setYoutubeCueStateHandler(null);
      setSoundcloudCueErrorHandler(null);
      setSoundcloudCueStateHandler(null);
    };
  }, [setDeck]);

  const togglePlay = useCallback(
    (id: DeckId) => {
      ensureAudio();
      const d = id === "A" ? deckARef.current : deckBRef.current;
      const next = !d.playing;
      const ytId = youtubeVideoIdOf(d.track);
      const scUrl = soundcloudCueUrlOf(d.track);
      setDeck(id, (prev) => ({ ...prev, playing: next }));
      setFocused(id);
      if (ytId) {
        // Official YouTube embed — no Web Audio oscillator / stems
        stopDeck(id);
        if (next) {
          void (async () => {
            try {
              setYoutubeCueVolume(id, deckXfVolume(id, crossfadeRef.current));
              await playYoutubeCue(id);
            } catch (err) {
              const msg = err instanceof Error ? err.message : "YouTube play failed";
              setDeck(id, (prev) => ({
                ...prev,
                playing: false,
                analyzeStatus: "error",
                analyzeMessage: msg,
              }));
            }
          })();
        } else {
          pauseYoutubeCue(id);
        }
        return;
      }
      if (scUrl) {
        // Official SoundCloud Widget — cue-only, mixReady false
        stopDeck(id);
        if (next) {
          void (async () => {
            try {
              setSoundcloudCueVolume(id, deckXfVolume(id, crossfadeRef.current));
              await playSoundcloudCue(id);
            } catch (err) {
              const msg = err instanceof Error ? err.message : "SoundCloud play failed";
              setDeck(id, (prev) => ({
                ...prev,
                playing: false,
                analyzeStatus: "error",
                analyzeMessage: msg,
              }));
            }
          })();
        } else {
          pauseSoundcloudCue(id);
        }
        return;
      }
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
      const ytId = youtubeVideoIdOf(d.track);
      const scUrl = soundcloudCueUrlOf(d.track);
      const cuePos = 0.12;
      setFocused(id);
      if (ytId) {
        stopDeck(id);
        setDeck(id, (prev) => ({ ...prev, playing: true, position: cuePos }));
        void (async () => {
          try {
            const dur = getYoutubeCueDurationSec(id) ?? Math.max(1, (d.track?.durationMs ?? 180000) / 1000);
            seekYoutubeCue(id, cuePos * dur);
            setYoutubeCueVolume(id, deckXfVolume(id, crossfadeRef.current));
            await playYoutubeCue(id);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "YouTube cue failed";
            setDeck(id, (prev) => ({
              ...prev,
              playing: false,
              analyzeStatus: "error",
              analyzeMessage: msg,
            }));
          }
        })();
        return;
      }
      if (scUrl) {
        stopDeck(id);
        setDeck(id, (prev) => ({ ...prev, playing: true, position: cuePos }));
        void (async () => {
          try {
            const dur =
              getSoundcloudCueDurationSec(id) ??
              Math.max(1, (d.track?.durationMs ?? 180000) / 1000);
            seekSoundcloudCue(id, cuePos * dur);
            setSoundcloudCueVolume(id, deckXfVolume(id, crossfadeRef.current));
            await playSoundcloudCue(id);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "SoundCloud cue failed";
            setDeck(id, (prev) => ({
              ...prev,
              playing: false,
              analyzeStatus: "error",
              analyzeMessage: msg,
            }));
          }
        })();
        return;
      }
      stopDeck(id);
      setDeck(id, (prev) => ({ ...prev, playing: false, position: cuePos }));
      playClick(id === "A" ? 990 : 780, 0.06, 0.12);
      startDeck(id, { ...gainsOf({ ...d, position: cuePos }, crossfadeRef.current), offset01: cuePos });
      setDeck(id, (prev) => ({ ...prev, playing: true, position: cuePos }));
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

  const stopXfAnimation = useCallback(() => {
    if (xfAnimStopRef.current) {
      xfAnimStopRef.current();
      xfAnimStopRef.current = null;
    }
    setTransitioning(false);
  }, []);

  const applyCrossfadeValue = useCallback(
    (v: number) => {
      crossfadeRef.current = v;
      setCrossfade(v);
      syncGains("A", deckARef.current, v);
      syncGains("B", deckBRef.current, v);
      syncStreamCueVolumes(v, deckARef.current, deckBRef.current);
    },
    [syncGains]
  );

  const animateCrossfadeTo = useCallback(
    (target: number, durationMs = DEFAULT_TRANSITION_MS) => {
      stopXfAnimation();
      const from = crossfadeRef.current;
      const clamped = Math.max(0, Math.min(1, target));
      setTransitioning(true);
      let cancelled = false;
      const { promise, stop } = animateValue(from, clamped, durationMs, (v) => {
        applyCrossfadeValue(v);
      });
      xfAnimStopRef.current = () => {
        cancelled = true;
        stop();
      };
      return promise.finally(() => {
        if (xfAnimStopRef.current) {
          // Clear only if we still own the slot
          xfAnimStopRef.current = null;
        }
        setTransitioning(false);
        if (!cancelled) applyCrossfadeValue(clamped);
      });
    },
    [applyCrossfadeValue, stopXfAnimation]
  );

  const playStreamCueIfNeeded = useCallback(
    async (id: DeckId) => {
      const d = id === "A" ? deckARef.current : deckBRef.current;
      if (!isStreamCueTrack(d.track) || d.playing) return;
      const ytId = youtubeVideoIdOf(d.track);
      const scUrl = soundcloudCueUrlOf(d.track);
      setDeck(id, (prev) => ({ ...prev, playing: true }));
      stopDeck(id);
      try {
        if (ytId) {
          setYoutubeCueVolume(id, deckXfVolume(id, crossfadeRef.current));
          await playYoutubeCue(id);
        } else if (scUrl) {
          setSoundcloudCueVolume(id, deckXfVolume(id, crossfadeRef.current));
          await playSoundcloudCue(id);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Stream play failed";
        setDeck(id, (prev) => ({
          ...prev,
          playing: false,
          analyzeStatus: "error",
          analyzeMessage: msg,
        }));
      }
    },
    [setDeck]
  );

  /** Smooth live blend toward a deck (starts stream cue Play if needed). */
  const transitionToDeck = useCallback(
    (id: DeckId) => {
      const d = id === "A" ? deckARef.current : deckBRef.current;
      if (!d.track) return;
      setFocused(id);
      void (async () => {
        if (isStreamCueTrack(d.track) && !d.playing) {
          await playStreamCueIfNeeded(id);
        } else if (d.track?.mixReady && !d.playing) {
          // Local/Demo: start Web Audio path
          ensureAudio();
          setDeck(id, (prev) => ({ ...prev, playing: true }));
          startDeck(id, {
            ...gainsOf(d, crossfadeRef.current),
            offset01: d.position,
          });
        }
        await animateCrossfadeTo(id === "A" ? 0 : 1, DEFAULT_TRANSITION_MS);
      })();
    },
    [animateCrossfadeTo, playStreamCueIfNeeded, setDeck]
  );

  const onCrossfade = useCallback(
    (v: number) => {
      // Manual drag cancels an in-flight auto-blend
      stopXfAnimation();
      applyCrossfadeValue(v);
    },
    [applyCrossfadeValue, stopXfAnimation]
  );


  const loadToDeck = useCallback(
    (id: DeckId, track: Track) => {
      stopDeck(id);
      clearDeckAudio(id);
      const ytId = youtubeVideoIdOf(track);
      const scUrl = soundcloudCueUrlOf(track);
      if (ytId) {
        clearSoundcloudCue(id);
      } else if (scUrl) {
        clearYoutubeCue(id);
      } else {
        clearYoutubeCue(id);
        clearSoundcloudCue(id);
      }
      const seed = hashStr(track.id + track.title);
      const cueMsg = ytId
        ? "YouTube cue · Play uses official embed (stems off)"
        : scUrl
          ? "SoundCloud cue · Play uses official Widget (stems off)"
          : "Cue-only · streaming";
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
        analyzeMessage: track.mixReady ? "Preparing…" : cueMsg,
      }));
      if (!track.mixReady) {
        if (id === "A") setPeaksA(generatePeaks(seed));
        else setPeaksB(generatePeaks(seed));
      }
      setFocused(id);
      playClick(550, 0.05, 0.1);
      if (track.mixReady) void prepareMixReady(id, track);
      const maybeAutoBlend = async () => {
        if (!autoTransitionRef.current) return;
        const otherId: DeckId = id === "A" ? "B" : "A";
        const other = otherId === "A" ? deckARef.current : deckBRef.current;
        // Live listening: other deck already playing → start this cue and blend over
        if (!other.playing) return;
        setDeck(id, (prev) => ({
          ...prev,
          analyzeMessage:
            prev.analyzeMessage?.replace("press Play", "auto-blending…") ??
            "Auto-blending…",
        }));
        // Park XF on the outgoing deck first so the incoming starts under the fade
        applyCrossfadeValue(otherId === "A" ? 0 : 1);
        try {
          if (ytId) {
            setYoutubeCueVolume(id, deckXfVolume(id, crossfadeRef.current));
            await playYoutubeCue(id);
          } else if (scUrl) {
            setSoundcloudCueVolume(id, deckXfVolume(id, crossfadeRef.current));
            await playSoundcloudCue(id);
          }
          setDeck(id, (prev) => ({ ...prev, playing: true }));
          await animateCrossfadeTo(id === "A" ? 0 : 1, DEFAULT_TRANSITION_MS);
          setDeck(id, (prev) => ({
            ...prev,
            analyzeStatus: "idle",
            analyzeMessage: ytId
              ? "YouTube live · crossfader blends decks"
              : "SoundCloud live · crossfader blends decks",
          }));
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Auto-blend failed";
          setDeck(id, (prev) => ({
            ...prev,
            playing: false,
            analyzeStatus: "error",
            analyzeMessage: msg,
          }));
        }
      };

      if (ytId) {
        void (async () => {
          try {
            await loadYoutubeCue(id, ytId, { autoplay: false });
            setYoutubeCueVolume(id, 0);
            setDeck(id, (prev) => ({
              ...prev,
              analyzeStatus: "idle",
              analyzeMessage: "YouTube cued · press Play",
            }));
            await maybeAutoBlend();
          } catch (err) {
            const msg = err instanceof Error ? err.message : "YouTube cue load failed";
            setDeck(id, (prev) => ({
              ...prev,
              analyzeStatus: "error",
              analyzeMessage: msg,
            }));
          }
        })();
      } else if (scUrl) {
        void (async () => {
          try {
            await loadSoundcloudCue(id, scUrl, { autoplay: false });
            setSoundcloudCueVolume(id, 0);
            setDeck(id, (prev) => ({
              ...prev,
              analyzeStatus: "idle",
              analyzeMessage: "SoundCloud cued · press Play",
            }));
            await maybeAutoBlend();
          } catch (err) {
            const msg = err instanceof Error ? err.message : "SoundCloud cue load failed";
            setDeck(id, (prev) => ({
              ...prev,
              analyzeStatus: "error",
              analyzeMessage: msg,
            }));
          }
        })();
      }
    },
    [setDeck, prepareMixReady, applyCrossfadeValue, animateCrossfadeTo]
  );

  const toggleSource = useCallback((id: keyof SourceFlags) => {
    setSources((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const connectSoundCloud = useCallback(async () => {
    setScError(null);
    if (!hasSoundCloudClientId()) {
      setScError(
        "Set VITE_SOUNDCLOUD_CLIENT_ID in web/.env.local (see docs/SOUNDCLOUD.md), then restart Vite."
      );
      return;
    }
    setScConnecting(true);
    try {
      await beginSoundCloudOAuth();
      // Browser navigates away; connecting stays true until redirect returns
    } catch (err) {
      const msg = err instanceof Error ? err.message : "SoundCloud connect failed";
      setScError(msg);
      setScConnecting(false);
    }
  }, []);

  const disconnectSoundCloud = useCallback(() => {
    if (scToken) void revokeSoundCloudToken(scToken);
    setScToken(null);
    setSources((prev) => ({ ...prev, soundcloud: false }));
    setScLibrary(null);
    setScMode("none");
    setScError(null);
  }, [scToken]);

  const connectYouTube = useCallback(async () => {
    setYtmConnecting(true);
    setYtmError(null);
    if (!hasGoogleClientId()) {
      setYtmError(
        "Set VITE_GOOGLE_CLIENT_ID in web/.env.local (see docs/YOUTUBE_MUSIC.md), then restart Vite."
      );
      setYtmConnecting(false);
      return;
    }
    try {
      const token = await requestGoogleAccessToken();
      setGoogleToken(token);
      const lib = await fetchYoutubeLibrary(token);
      setYtmLibrary(lib);
      setYtmMode("google");
      setSources((prev) => ({ ...prev, youtube: true }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "YouTube connect failed";
      setYtmError(msg);
      setYtmLibrary(null);
      setYtmMode("none");
      setGoogleToken(null);
      setSources((prev) => ({ ...prev, youtube: false }));
    } finally {
      setYtmConnecting(false);
    }
  }, []);

  const disconnectYouTube = useCallback(() => {
    if (googleToken) revokeGoogleToken(googleToken);
    setGoogleToken(null);
    setYtmLibrary(null);
    setYtmMode("none");
    setYtmError(null);
    setSources((prev) => ({ ...prev, youtube: false }));
  }, [googleToken]);

  // Finish SoundCloud OAuth after redirect back to localhost.
  // takeSoundCloudCallback stashes ?code= then strips the URL so React StrictMode
  // remounts still finish the same single-flight token exchange (avoids invalid_grant).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let cb: ReturnType<typeof takeSoundCloudCallback> = null;
      try {
        cb = takeSoundCloudCallback();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "SoundCloud OAuth error";
        setScError(msg);
        clearPendingSoundCloudCallback();
        return;
      }
      if (!cb) return;
      setScConnecting(true);
      setScError(null);
      try {
        const tokens = await exchangeSoundCloudCode(cb.code, cb.state);
        // Shared cache/single-flight: even if this StrictMode pass is cancelled,
        // leave pending so the remount applies the same tokens.
        if (cancelled) return;
        setScToken(tokens.access_token);
        const { library } = await fetchSoundCloudLibrary(tokens.access_token);
        if (cancelled) return;
        setScLibrary(library);
        setScMode("oauth");
        setSources((prev) => ({ ...prev, soundcloud: true }));
        clearPendingSoundCloudCallback();
      } catch (err) {
        clearPendingSoundCloudCallback();
        const msg = err instanceof Error ? err.message : "SoundCloud token exchange failed";
        if (!cancelled) {
          setScError(msg);
          setScLibrary(null);
          setScMode("none");
          setSources((prev) => ({ ...prev, soundcloud: false }));
        }
      } finally {
        if (!cancelled) setScConnecting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        let pos: number;
        if (a.track?.mixReady) {
          pos = getDeckPosition01("A");
        } else if (youtubeVideoIdOf(a.track)) {
          pos = getYoutubeCuePosition01("A") ?? a.position;
        } else if (soundcloudCueUrlOf(a.track)) {
          pos = getSoundcloudCuePosition01("A") ?? a.position;
        } else {
          pos = a.position + 0.000035 * ((a.track?.bpm ?? 128) / 128) * (1 + a.pitchPercent / 100);
          if (pos > 0.92) pos = 0.08;
        }
        setDeckA((prev) => ({ ...prev, position: pos }));
      }
      if (b.playing) {
        let pos: number;
        if (b.track?.mixReady) {
          pos = getDeckPosition01("B");
        } else if (youtubeVideoIdOf(b.track)) {
          pos = getYoutubeCuePosition01("B") ?? b.position;
        } else if (soundcloudCueUrlOf(b.track)) {
          pos = getSoundcloudCuePosition01("B") ?? b.position;
        } else {
          pos = b.position + 0.000035 * ((b.track?.bpm ?? 128) / 128) * (1 + b.pitchPercent / 100);
          if (pos > 0.92) pos = 0.08;
        }
        setDeckB((prev) => ({ ...prev, position: pos }));
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
    if (youtubeVideoIdOf(deckA.track)) {
      setYoutubeCueVolume("A", deckA.playing ? deckXfVolume("A", crossfade) : 0);
    }
    if (soundcloudCueUrlOf(deckA.track)) {
      setSoundcloudCueVolume("A", deckA.playing ? deckXfVolume("A", crossfade) : 0);
    }
  }, [deckA.playing, deckA.stems, deckA.mutes, deckA.solos, crossfade, syncGains, deckA]);

  useEffect(() => {
    syncGains("B", deckB, crossfade);
    if (youtubeVideoIdOf(deckB.track)) {
      setYoutubeCueVolume("B", deckB.playing ? deckXfVolume("B", crossfade) : 0);
    }
    if (soundcloudCueUrlOf(deckB.track)) {
      setSoundcloudCueVolume("B", deckB.playing ? deckXfVolume("B", crossfade) : 0);
    }
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
    if (sources.soundcloud && scLibrary) {
      const scTracks = [
        ...scLibrary.stream,
        ...scLibrary.likes,
        ...scLibrary.playlists.flatMap((p) => p.tracks),
      ];
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
    autoTransition,
    setAutoTransition,
    transitioning,
    transitionToDeck,
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
    scError,
    ytmMode,
    scMode,
    ytmLibrary,
    scLibrary,
    importLocalFiles,
    globalAnalyzing,
  };
}
