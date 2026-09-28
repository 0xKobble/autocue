# Autocue

**Cue. Split. Mix. Anywhere.**

Autocue is a music aggregator for cueing and mixing across streaming services (Spotify, Apple Music, local files) with **on-device AI stem splitting** and **AI-assisted setlists**. Dual-deck UI, stem faders, harmonic matching — built for DJs and producers who want to prepare and mix without leaving their catalog.

> **Important:** Protected streaming tracks (Spotify/Apple DRM) cannot be true-mixed or stem-split. Autocue uses streaming for browse/cue/metadata, and **Local / Downloaded mode** (plus demo stems) for real mixing and AI stems. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Brand

| Token | Hex | Role |
|-------|-----|------|
| Void Black | `#0A0A0B` | Background |
| Acid Lime | `#B8FF3C` | Primary / Deck A |
| Violet Pulse | `#7B5CFF` | Deck B / AI accents |
| Fog Gray | `#9A9AA3` | Secondary text |

Tagline: **Cue. Split. Mix. Anywhere.**

---

## Quick start

### Web app (Vite + React + TypeScript)

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → web/dist
```

Dual-deck React port of the prototype: Deck, Waveform, Transport, Crossfader, StemPanel, SetlistStrip, TrackBadge, mock catalog, Web Audio oscillators, **mixReady** gating (cue-only vs mix-ready).

### Mobile (Expo / React Native)

```bash
cd mobile
npm install
npx expo start          # Expo Go / simulator
npm run ios             # macOS + Simulator
```

**EAS / TestFlight production iOS build:**

```bash
cd mobile
npm install -g eas-cli
eas login
eas init                # once — paste projectId into app.json
eas build -p ios --profile production
eas submit -p ios --profile production --latest
```

Full steps, Apple credentials you must supply, and blockers: **[docs/TESTFLIGHT.md](docs/TESTFLIGHT.md)**.

Bundle ID: `com.kobble.autocue`

### HTML prototype (no build)

```bash
# From repo root
npm run proto
# → http://localhost:5173  (serves prototype/)
```

Or open `prototype/index.html` directly. Mock catalog + Web Audio only — not real streaming.

---

## Folder map

```
autocue/
├── README.md
├── package.json              ← proto scripts + workspace helpers
├── docs/
│   ├── PRODUCT.md
│   ├── ARCHITECTURE.md
│   ├── HANDOFF.md
│   └── TESTFLIGHT.md         ← Apple / EAS / TestFlight steps
├── prototype/                ← static dual-deck (kept working)
├── web/                      ← Vite + React + TypeScript
└── mobile/                   ← Expo Router + EAS (TestFlight path)
    ├── app/                  ← Expo Router screens
    ├── app.json              ← bundle id com.kobble.autocue
    └── eas.json              ← production profile for eas build -p ios
```

---

## What ships today

| Surface | Status |
|---------|--------|
| Dual decks (A lime / B violet) | Web + mobile + prototype |
| Waveforms + stem mute layers | Web (canvas); mobile (bar viz) |
| Play / cue / sync + crossfader | Web + mobile + prototype |
| AI Stems panel (mixReady gated) | Web + mobile + prototype |
| AI Setlist strip + badges | Web + mobile + prototype |
| Mock catalog only | All — no real Spotify/Apple audio |
| TestFlight submit | Documented; needs your Apple + EAS credentials |

---

## TestFlight status

**Blocked on credentials you must provide:**

1. Apple Developer Team ID / membership  
2. App Store Connect app + numeric App ID  
3. ASC API key (`.p8`) **or** Apple ID for `eas submit`  
4. EAS project ID from `eas init`  

Until those exist, `eas build -p ios` / `eas submit` cannot finish. See [docs/TESTFLIGHT.md](docs/TESTFLIGHT.md).

---

## Legal / product guardrails

- Do **not** invent or claim legal true-mixing of DRM-protected streams.
- Streaming APIs = catalog, metadata, preview/cue where licensed.
- Real mix + stem split = **Local Mode** (user-owned files) + demo stems for the UI.
- Ship clear UI copy when a track is “cue-only” vs “mix-ready.”

---

## Docs

- [PRODUCT.md](docs/PRODUCT.md) — flows & metrics  
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — systems & DRM model  
- [HANDOFF.md](docs/HANDOFF.md) — agent phase prompts  
- [TESTFLIGHT.md](docs/TESTFLIGHT.md) — iOS TestFlight / EAS  

GitHub: [0xKobble/autocue](https://github.com/0xKobble/autocue)

---

## License

UNLICENSED — private scaffold for product development.
