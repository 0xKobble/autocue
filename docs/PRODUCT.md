# Autocue — Product

**Cue. Split. Mix. Anywhere.**

Autocue helps DJs and producers **browse** catalogs across Spotify, Apple Music, YouTube Music, SoundCloud, and local files; **cue** tracks into dual decks; **split** mix-ready audio into stems on-device; **mix** with crossfader and stem faders; and generate **AI setlists** with harmonic/energy awareness.

---

## Positioning

| Audience | Job to be done |
|----------|----------------|
| Bedroom / mobile DJs | Prep sets from streaming catalogs, mix locally owned files |
| Producers | Isolate stems for remix / practice without leaving the app |
| Live performers | Cue next tracks, see Camelot matches, AI-suggested transitions |

**Not a claim:** Autocue is not a DRM circumvention tool. Streaming = browse / metadata / licensed preview. Mixing & stems = Local / Demo (decodable audio only).

---

## Sources — mix vs cue-only

| Source | Connect UX | Mix / stems (`mixReady`) | Notes |
|--------|------------|---------------------------|-------|
| **Local files** | File picker / drag-drop | **Yes** | Decode with Web Audio; band-split preview stems |
| **Demo stem packs** | In catalog | **Yes** | 4 independent buffers; CDJ faders work |
| **SoundCloud** | Mock OAuth + catalog | Cue by default; downloadable mock → mix | Real API needs SoundCloud **client id** (not in repo) |
| **YouTube Music** | Mock OAuth + **GPM-style** Library / Playlists / Recents | **Cue-only** | Inspired by classic Google Play Music browse UX; no live GPM API (shutdown) |
| **Spotify** | Toggle (cue catalog) | **Cue-only** | DRM — never true mix/stem |
| **Apple Music** | Toggle (cue catalog) | **Cue-only** | DRM — never true mix/stem |

Google Play Music itself is **not** a live source (service shutdown). YouTube Music carries forward the playlist/library browse feel.

---

## Core experience flow

```
Browse → Cue → Split → Mix → AI Setlist
```

### 1. Browse

- Unified catalog across connected sources.
- YouTube Music: Library / Playlists / Recents (GPM-inspired).
- Badges: source + mix-ready vs cue-only.

### 2. Cue

- Load track to Deck A or B.
- Cue-only banner on streaming DRM / YTM tracks.

### 3. Split (Local / Demo only)

- Client-side stem engine:
  - **Demo packs** → 4 independent buffers.
  - **Local uploads** → decode + **band-split** preview stems (honest label until Demucs).
- Path to real Demucs: Electron/native or WASM later — see ARCHITECTURE.

### 4. Mix

- Dual-deck transport, pitch, sync (mix-ready), crossfader.
- Per-stem gain + mute/solo (CDJ-style).

### 5. AI Setlist

- Harmonic / energy / AI Mode ranking across unified catalog.

---

## Legal / product guardrails

- Do **not** invent or claim true-mixing of Spotify / Apple Music / YouTube Music DRM streams.
- Real mix + stem split = **Local** + **Demo** (+ optional SC downloadable mirrors).
- Ship clear UI copy when a track is cue-only vs mix-ready.

---

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [HANDOFF.md](./HANDOFF.md)
- [TESTFLIGHT.md](./TESTFLIGHT.md)
- [../README.md](../README.md)
