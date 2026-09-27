/**
 * Autocue prototype — dual decks, stem faders, AI setlist, Web Audio feedback.
 * Mock catalog only. No real Spotify/Apple streaming.
 */
(() => {
  "use strict";

  const STEM_NAMES = ["vocals", "drums", "bass", "other"];
  const STEM_COLORS = {
    vocals: "rgba(255, 120, 180, 0.85)",
    drums: "rgba(184, 255, 60, 0.9)",
    bass: "rgba(80, 180, 255, 0.85)",
    other: "rgba(180, 160, 255, 0.75)",
  };
  const STEM_COLORS_B = {
    vocals: "rgba(255, 140, 200, 0.85)",
    drums: "rgba(160, 130, 255, 0.9)",
    bass: "rgba(120, 200, 255, 0.85)",
    other: "rgba(200, 180, 255, 0.7)",
  };

  /** @type {Record<"A"|"B", object>} */
  const decks = {
    A: {
      id: "A",
      title: "Neon Drift",
      artist: "Lumen Arc",
      bpm: 128,
      camelot: "8A",
      key: "Am",
      mixReady: true,
      source: "local",
      playing: false,
      synced: false,
      position: 0.28,
      stems: { vocals: 1, drums: 1, bass: 1, other: 1 },
      seed: 42,
      baseFreq: 220,
    },
    B: {
      id: "B",
      title: "Violet Static",
      artist: "Pulse Theory",
      bpm: 126,
      camelot: "9A",
      key: "Em",
      mixReady: false,
      source: "spotify",
      playing: false,
      synced: false,
      position: 0.35,
      stems: { vocals: 1, drums: 1, bass: 1, other: 1 },
      seed: 99,
      baseFreq: 196,
    },
  };

  const mockCatalog = [
    {
      id: "t1",
      title: "Acid Rain Protocol",
      artist: "Grid Runner",
      bpm: 130,
      camelot: "8A",
      source: "spotify",
      mixReady: false,
      reason: "Camelot match 8A",
      energy: 0.82,
    },
    {
      id: "t2",
      title: "Harbor Lights",
      artist: "Soft Circuit",
      bpm: 124,
      camelot: "7A",
      source: "apple",
      mixReady: false,
      reason: "Energy continuity",
      energy: 0.71,
    },
    {
      id: "t3",
      title: "Demo Stem Pack — Night Bus",
      artist: "Autocue Demo",
      bpm: 128,
      camelot: "8A",
      source: "demo",
      mixReady: true,
      reason: "Mix-ready · harmonic",
      energy: 0.78,
    },
    {
      id: "t4",
      title: "Carbon Halo",
      artist: "Vera Flux",
      bpm: 127,
      camelot: "9A",
      source: "spotify",
      mixReady: false,
      reason: "Relative key 9A",
      energy: 0.75,
    },
    {
      id: "t5",
      title: "Local File — Warehouse Cut",
      artist: "You",
      bpm: 129,
      camelot: "8B",
      source: "local",
      mixReady: true,
      reason: "Local · energy+",
      energy: 0.88,
    },
    {
      id: "t6",
      title: "Glass Orchestra",
      artist: "Nimbus",
      bpm: 120,
      camelot: "5A",
      source: "apple",
      mixReady: false,
      reason: "AI creative pick",
      energy: 0.55,
    },
  ];

  let focusedDeck = "A";
  let stemTargetDeck = "A";
  let crossfade = 0.5;
  let aiMode = true;
  let harmonicOn = true;
  let energyOn = true;
  let audioCtx = null;
  /** @type {Record<string, object>} */
  const voices = {};
  let raf = 0;

  // ——— seeded pseudo-random for stable waveforms ———
  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generatePeaks(seed, layers = 4, bars = 96) {
    const rand = mulberry32(seed);
    const peaks = [];
    for (let L = 0; L < layers; L++) {
      const layer = [];
      let env = 0.4;
      for (let i = 0; i < bars; i++) {
        env += (rand() - 0.48) * 0.15;
        env = Math.max(0.12, Math.min(0.98, env));
        const kick = L === 1 && i % 4 === 0 ? 0.25 : 0;
        const vocal = L === 0 ? Math.sin(i / 6) * 0.15 + 0.1 : 0;
        layer.push(Math.min(1, env * (0.55 + rand() * 0.45) + kick + Math.abs(vocal)));
      }
      peaks.push(layer);
    }
    return peaks;
  }

  const waveformCache = {
    A: generatePeaks(decks.A.seed),
    B: generatePeaks(decks.B.seed),
  };

  // ——— Web Audio ———
  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function playClick(freq = 880, dur = 0.05, gain = 0.15) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  function deckMasterGain(id) {
    // constant-power-ish XF
    const x = crossfade;
    if (id === "A") return Math.cos(x * 0.5 * Math.PI);
    return Math.cos((1 - x) * 0.5 * Math.PI);
  }

  function stemMix(id) {
    const s = decks[id].stems;
    return (s.vocals + s.drums + s.bass + s.other) / 4;
  }

  function stopVoice(id) {
    const v = voices[id];
    if (!v) return;
    try {
      v.osc.stop();
    } catch (_) { /* already stopped */ }
    try {
      v.lfo.stop();
    } catch (_) { /* */ }
    delete voices[id];
  }

  function startVoice(id) {
    const ctx = ensureAudio();
    if (!ctx) return;
    stopVoice(id);
    const deck = decks[id];
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = id === "A" ? "sawtooth" : "triangle";
    osc.frequency.value = deck.baseFreq;
    lfo.type = "sine";
    lfo.frequency.value = deck.bpm / 60;
    lfoGain.gain.value = 8;
    filter.type = "lowpass";
    filter.frequency.value = 1200 + stemMix(id) * 1800;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);

    const level = 0.045 * deckMasterGain(id) * Math.max(0.05, stemMix(id));
    g.gain.value = deck.playing ? level : 0;

    osc.start();
    lfo.start();
    voices[id] = { osc, lfo, g, filter };
  }

  function updateVoiceGains() {
    for (const id of ["A", "B"]) {
      const v = voices[id];
      const deck = decks[id];
      if (!v) continue;
      const level = deck.playing
        ? 0.045 * deckMasterGain(id) * Math.max(0.05, stemMix(id))
        : 0;
      v.g.gain.setTargetAtTime(level, audioCtx.currentTime, 0.03);
      if (v.filter) {
        v.filter.frequency.setTargetAtTime(
          600 + stemMix(id) * 2400,
          audioCtx.currentTime,
          0.05
        );
      }
    }
  }

  // ——— Waveform draw ———
  function drawWaveform(canvas, deckId) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (cssW === 0) return;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = cssW;
    const h = cssH;
    const mid = h / 2;
    const peaks = waveformCache[deckId];
    const deck = decks[deckId];
    const colors = deckId === "A" ? STEM_COLORS : STEM_COLORS_B;
    const bars = peaks[0].length;
    const gap = 1.5;
    const barW = (w - gap * bars) / bars;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0C0C0E";
    ctx.fillRect(0, 0, w, h);

    // grid line
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();

    for (let L = STEM_NAMES.length - 1; L >= 0; L--) {
      const name = STEM_NAMES[L];
      const gain = deck.stems[name];
      if (gain < 0.02) continue;
      const layer = peaks[L];
      const alpha = 0.35 + gain * 0.65;
      ctx.fillStyle = colors[name].replace(/[\d.]+\)$/, `${alpha})`);

      for (let i = 0; i < bars; i++) {
        const amp = layer[i] * gain * (0.55 + L * 0.08);
        const bh = amp * (h * 0.42);
        const x = i * (barW + gap);
        const y = mid - bh;
        ctx.globalAlpha = 1;
        ctx.fillRect(x, y, Math.max(1, barW), bh * 2);
      }
    }

    // playing shimmer
    if (deck.playing) {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      const accent = deckId === "A" ? "184,255,60" : "123,92,255";
      grad.addColorStop(0, "transparent");
      grad.addColorStop(deck.position, `rgba(${accent},0.12)`);
      grad.addColorStop(Math.min(1, deck.position + 0.08), "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function updatePlayhead(deckId) {
    const el = document.querySelector(`.deck[data-deck="${deckId}"] .playhead`);
    if (el) el.style.left = `${decks[deckId].position * 100}%`;
  }

  function updateMeters() {
    const ma = document.getElementById("meter-a");
    const mb = document.getElementById("meter-b");
    const pulseA = decks.A.playing ? 35 + Math.random() * 55 * stemMix("A") * deckMasterGain("A") : 8;
    const pulseB = decks.B.playing ? 35 + Math.random() * 55 * stemMix("B") * deckMasterGain("B") : 8;
    if (ma) ma.style.height = `${pulseA}%`;
    if (mb) mb.style.height = `${pulseB}%`;
  }

  function tick(ts) {
    for (const id of ["A", "B"]) {
      const d = decks[id];
      if (d.playing) {
        const speed = (d.bpm / 128) * 0.000035;
        d.position += speed;
        if (d.position > 0.92) d.position = 0.08;
        updatePlayhead(id);
        const canvas = document.querySelector(`.deck[data-deck="${id}"] .waveform`);
        if (canvas) drawWaveform(canvas, id);
      }
    }
    updateMeters();
    raf = requestAnimationFrame(tick);
  }

  // ——— UI bindings ———
  function setFocused(id) {
    focusedDeck = id;
    document.querySelectorAll(".deck").forEach((el) => {
      el.classList.toggle("focused", el.dataset.deck === id);
    });
  }

  function togglePlay(id) {
    ensureAudio();
    const d = decks[id];
    d.playing = !d.playing;
    const btn = document.querySelector(`.deck[data-deck="${id}"] [data-action="play"]`);
    if (btn) btn.setAttribute("aria-pressed", String(d.playing));
    if (d.playing) {
      startVoice(id);
      playClick(id === "A" ? 660 : 520, 0.04, 0.08);
    } else {
      stopVoice(id);
    }
    updateVoiceGains();
    setFocused(id);
  }

  function cueDeck(id) {
    ensureAudio();
    const d = decks[id];
    d.playing = false;
    d.position = 0.12;
    stopVoice(id);
    const btn = document.querySelector(`.deck[data-deck="${id}"] [data-action="play"]`);
    if (btn) btn.setAttribute("aria-pressed", "false");
    updatePlayhead(id);
    drawWaveform(document.querySelector(`.deck[data-deck="${id}"] .waveform`), id);
    playClick(id === "A" ? 990 : 780, 0.06, 0.12);
    // brief blip to simulate cue preview
    startVoice(id);
    d.playing = true;
    updateVoiceGains();
    setTimeout(() => {
      d.playing = false;
      stopVoice(id);
      const b = document.querySelector(`.deck[data-deck="${id}"] [data-action="play"]`);
      if (b) b.setAttribute("aria-pressed", "false");
    }, 180);
    setFocused(id);
  }

  function toggleSync(id) {
    const d = decks[id];
    d.synced = !d.synced;
    const btn = document.querySelector(`.deck[data-deck="${id}"] [data-action="sync"]`);
    if (btn) btn.classList.toggle("active", d.synced);
    if (d.synced && decks.A.mixReady && decks.B.mixReady) {
      // soft sync BPM display only in prototype
      playClick(440, 0.04, 0.06);
    } else if (d.synced && (!decks.A.mixReady || !decks.B.mixReady)) {
      playClick(220, 0.08, 0.05);
    }
  }

  function setStem(name, value01) {
    const d = decks[stemTargetDeck];
    d.stems[name] = value01;
    const canvas = document.querySelector(`.deck[data-deck="${stemTargetDeck}"] .waveform`);
    if (canvas) drawWaveform(canvas, stemTargetDeck);
    updateVoiceGains();
  }

  function updateStemNote() {
    const note = document.getElementById("stem-note");
    if (!note) return;
    const d = decks[stemTargetDeck];
    if (d.mixReady) {
      note.classList.remove("warn");
      note.textContent = `Deck ${stemTargetDeck} is mix-ready — stems active (${d.source}).`;
    } else {
      note.classList.add("warn");
      note.textContent = `Deck ${stemTargetDeck} is cue-only (${d.source} DRM). Split disabled — use Local Mode for real stems.`;
    }
  }

  function setStemTarget(id) {
    stemTargetDeck = id;
    document.querySelectorAll(".stem-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.stemDeck === id);
    });
    const wrap = document.getElementById("stem-faders");
    if (wrap) wrap.dataset.activeDeck = id;
    // sync fader UI to deck stem state
    STEM_NAMES.forEach((name) => {
      const input = document.querySelector(`.stem-fader[data-stem="${name}"] input`);
      if (input) input.value = String(Math.round(decks[id].stems[name] * 100));
    });
    updateStemNote();
  }

  function sourceBadge(source) {
    const label =
      source === "spotify"
        ? "Spotify"
        : source === "apple"
          ? "Apple"
          : source === "demo"
            ? "Demo"
            : "Local";
    return `<span class="source-badge ${source}">${label}</span>`;
  }

  function rankSetlist() {
    let items = [...mockCatalog];
    if (harmonicOn) {
      items = items.map((t) => {
        let score = t.energy;
        if (t.camelot === decks.A.camelot || t.camelot === decks.B.camelot) score += 0.35;
        if (t.camelot && t.camelot.slice(0, -1) === decks.A.camelot.slice(0, -1)) score += 0.15;
        return { ...t, _score: score };
      });
    } else {
      items = items.map((t) => ({ ...t, _score: t.energy }));
    }
    if (energyOn) {
      items.sort((a, b) => b._score - a._score);
    } else if (harmonicOn) {
      items.sort((a, b) => b._score - a._score);
    }
    if (!aiMode) {
      items = items.map((t) => ({ ...t, reason: "Manual order" }));
    }
    return items;
  }

  function renderSetlist() {
    const strip = document.getElementById("setlist-strip");
    if (!strip) return;
    strip.classList.toggle("ai-off", !aiMode);
    const items = rankSetlist();
    strip.innerHTML = items
      .map(
        (t) => `
      <article class="setlist-card" role="listitem" data-id="${t.id}" title="Load suggestion (mock)">
        <h4 class="card-title">${t.title}</h4>
        <p class="card-artist">${t.artist}</p>
        <div class="card-meta">
          <span>${t.bpm} · ${t.camelot}</span>
          ${sourceBadge(t.source)}
        </div>
        <span class="card-reason">${t.reason}${t.mixReady ? " · mix-ready" : " · cue-only"}</span>
      </article>`
      )
      .join("");

    strip.querySelectorAll(".setlist-card").forEach((card) => {
      card.addEventListener("click", () => {
        const track = mockCatalog.find((x) => x.id === card.dataset.id);
        if (!track) return;
        loadToDeck(focusedDeck, track);
        playClick(550, 0.05, 0.1);
      });
    });
  }

  function loadToDeck(id, track) {
    const d = decks[id];
    d.title = track.title;
    d.artist = track.artist;
    d.bpm = track.bpm;
    d.camelot = track.camelot;
    d.key = track.camelot?.endsWith("A") ? "minor" : "major";
    d.mixReady = track.mixReady;
    d.source = track.source;
    d.position = 0.2;
    d.playing = false;
    stopVoice(id);

    const root = document.querySelector(`.deck[data-deck="${id}"]`);
    if (!root) return;
    root.querySelector('[data-field="title"]').textContent = d.title;
    root.querySelector('[data-field="artist"]').textContent = d.artist;
    root.querySelector('[data-field="bpm"]').textContent = `${d.bpm} BPM`;
    root.querySelector('[data-field="camelot"]').textContent = d.camelot;
    root.querySelector('[data-field="key"]').textContent = d.key;

    const badge = root.querySelector(".badge");
    if (badge) {
      badge.className = "badge";
      if (track.source === "spotify") {
        badge.classList.add("badge-spotify");
        badge.textContent = "Cue-only · Spotify";
      } else if (track.source === "apple") {
        badge.classList.add("badge-apple");
        badge.textContent = "Cue-only · Apple";
      } else {
        badge.classList.add("badge-local");
        badge.textContent = track.mixReady
          ? `Mix-ready · ${track.source === "demo" ? "Demo" : "Local"}`
          : "Cue-only";
      }
      badge.dataset.ready = String(track.mixReady);
    }

    const playBtn = root.querySelector('[data-action="play"]');
    if (playBtn) playBtn.setAttribute("aria-pressed", "false");

    waveformCache[id] = generatePeaks(hashStr(track.id + track.title));
    drawWaveform(root.querySelector(".waveform"), id);
    updatePlayhead(id);
    if (stemTargetDeck === id) updateStemNote();
    setFocused(id);
  }

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h) || 1;
  }

  function bindDecks() {
    document.querySelectorAll(".deck").forEach((deckEl) => {
      const id = deckEl.dataset.deck;
      deckEl.addEventListener("click", (e) => {
        if (!e.target.closest("button")) setFocused(id);
      });
      deckEl.querySelector('[data-action="play"]')?.addEventListener("click", (e) => {
        e.stopPropagation();
        togglePlay(id);
      });
      deckEl.querySelector('[data-action="cue"]')?.addEventListener("click", (e) => {
        e.stopPropagation();
        cueDeck(id);
      });
      deckEl.querySelector('[data-action="sync"]')?.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleSync(id);
      });
    });
  }

  function bindMixer() {
    const xf = document.getElementById("crossfader");
    if (!xf) return;
    xf.addEventListener("input", () => {
      crossfade = Number(xf.value) / 100;
      updateVoiceGains();
    });
  }

  function bindStems() {
    document.querySelectorAll(".stem-tab").forEach((tab) => {
      tab.addEventListener("click", () => setStemTarget(tab.dataset.stemDeck));
    });
    STEM_NAMES.forEach((name) => {
      const input = document.querySelector(`.stem-fader[data-stem="${name}"] input`);
      if (!input) return;
      input.addEventListener("input", () => {
        setStem(name, Number(input.value) / 100);
      });
    });
    setStemTarget("A");
  }

  function bindSetlistControls() {
    const ai = document.getElementById("ai-mode");
    const harm = document.getElementById("toggle-harmonic");
    const energy = document.getElementById("toggle-energy");
    ai?.addEventListener("change", () => {
      aiMode = ai.checked;
      renderSetlist();
    });
    harm?.addEventListener("change", () => {
      harmonicOn = harm.checked;
      renderSetlist();
    });
    energy?.addEventListener("change", () => {
      energyOn = energy.checked;
      renderSetlist();
    });
  }

  function bindHelp() {
    const dlg = document.getElementById("help-dialog");
    document.getElementById("btn-help")?.addEventListener("click", () => dlg?.showModal());
  }

  function bindKeys() {
    window.addEventListener("keydown", (e) => {
      if (e.target.matches("input, textarea")) return;
      const xf = document.getElementById("crossfader");
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay(focusedDeck);
          break;
        case "a":
        case "A":
          setFocused("A");
          break;
        case "b":
        case "B":
          setFocused("B");
          break;
        case "q":
        case "Q":
          cueDeck(focusedDeck);
          break;
        case "ArrowLeft":
          if (xf) {
            xf.value = String(Math.max(0, Number(xf.value) - 3));
            crossfade = Number(xf.value) / 100;
            updateVoiceGains();
          }
          break;
        case "ArrowRight":
          if (xf) {
            xf.value = String(Math.min(100, Number(xf.value) + 3));
            crossfade = Number(xf.value) / 100;
            updateVoiceGains();
          }
          break;
        case "?":
          document.getElementById("help-dialog")?.showModal();
          break;
        default:
          break;
      }
    });
  }

  function initWaveforms() {
    document.querySelectorAll(".deck").forEach((deckEl) => {
      const id = deckEl.dataset.deck;
      const canvas = deckEl.querySelector(".waveform");
      drawWaveform(canvas, id);
      updatePlayhead(id);
    });
    window.addEventListener("resize", () => {
      for (const id of ["A", "B"]) {
        const canvas = document.querySelector(`.deck[data-deck="${id}"] .waveform`);
        drawWaveform(canvas, id);
      }
    });
  }

  function init() {
    bindDecks();
    bindMixer();
    bindStems();
    bindSetlistControls();
    bindHelp();
    bindKeys();
    renderSetlist();
    initWaveforms();
    setFocused("A");
    raf = requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
