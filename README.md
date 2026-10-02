# Autocue

**Cue. Split. Mix. Anywhere.**

Autocue is a music aggregator for cueing and mixing across Spotify, Apple Music, **YouTube Music**, SoundCloud, and local files with **on-device stem splitting** and **AI-assisted setlists**. Dual-deck UI, CDJ-style stem faders, harmonic matching — built for DJs who prep from streaming and mix from Local / Demo.

> **Important:** Spotify / Apple Music / **YouTube Music** DRM streams are **cue/browse only** — never true-mixed or stem-split. SoundCloud streams are cue-only unless a downloadable/local mirror. **Local uploads** and **Demo stem packs** are `mixReady`. YouTube Music uses a **Google Play Music–inspired** Library / Playlists / Recents UI (GPM itself is shut down — no live GPM API). See [docs/PRODUCT.md](docs/PRODUCT.md).

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

#### YouTube Music Connect

- **No client ID:** Sources → **Connect YouTube Music** → demo GPM-style Library / Playlists / Recents (cue-only).
- **With Google:** set `VITE_GOOGLE_CLIENT_ID` in `web/.env.local` (see `web/.env.example`) → **Connect with Google** loads your YouTube playlists via YouTube Data API v3 (still cue-only).
- Full steps: **[docs/YOUTUBE_MUSIC.md](docs/YOUTUBE_MUSIC.md)**.


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
│   ├── TESTFLIGHT.md         ← Apple / EAS / TestFlight steps
│   └── YOUTUBE_MUSIC.md      ← Google OAuth + YTM browse
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
| Sources / Library panel | Web — Local, SC mock, YTM (GPM-style), Spotify/Apple cue |
| YTM Library / Playlists / Recents | Web — Connect button; demo library or Google OAuth + YouTube Data API (cue-only) |
| Local file upload + band-split stems | Web — Web Audio client-side |
| Demo stem packs (4 buffers) | Web — CDJ mute/solo/faders |
| Play / cue / sync / pitch + crossfader | Web + mobile + prototype |
| AI Stems panel (mixReady gated) | Web + mobile + prototype |
| AI Setlist strip + badges | Web + mobile + prototype |
| Real Spotify/Apple/YTM/SC audio | Not shipped — mock / cue-only honesty |
| True Demucs ML stems | Not yet — band-split / demo until WASM/native |
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
- Streaming APIs (Spotify / Apple / YouTube Music / SoundCloud) = catalog, metadata, preview/cue where licensed.
- Real mix + stem split = **Local Mode** (user-owned files) + **Demo** stem packs.
- YouTube Music UI mirrors classic **Google Play Music** library browse; GPM API is not used.
- Ship clear UI copy when a track is “cue-only” vs “mix-ready.”

---

## Docs

- [PRODUCT.md](docs/PRODUCT.md) — flows & metrics  
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — systems & DRM model  
- [HANDOFF.md](docs/HANDOFF.md) — agent phase prompts  
- [TESTFLIGHT.md](docs/TESTFLIGHT.md) — iOS TestFlight / EAS  
- [YOUTUBE_MUSIC.md](docs/YOUTUBE_MUSIC.md) — Google Connect / YTM library  

GitHub: [0xKobble/autocue](https://github.com/0xKobble/autocue)

---

## License

UNLICENSED — private scaffold for product development.
