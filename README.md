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

## Quick start — prototype

No build step. Open the static dual-deck UI:

```bash
# From this repo root (Python static server — no deps)
npm run proto
# → http://localhost:5173
```

Or open the file directly (fully offline):

```bash
open prototype/index.html   # macOS
xdg-open prototype/index.html   # Linux
```

Optional Node static server:

```bash
npm run proto:serve
```

The prototype uses mock catalog data and Web Audio oscillators for play/cue click feedback. It does **not** stream real Spotify/Apple audio.

---

## Folder map

```
autocue/
├── README.md                 ← you are here
├── package.json              ← `npm run proto`
├── docs/
│   ├── PRODUCT.md            ← experience flows, screens, metrics
│   ├── ARCHITECTURE.md       ← system design, data models, Mermaid
│   └── HANDOFF.md            ← paste-ready prompts for coding agents
└── prototype/
    ├── index.html            ← dual-deck shell
    ├── styles.css            ← brand tokens + layout
    └── app.js                ← decks, stems, setlist, Web Audio
```

---

## What the prototype shows

- Wordmark + dual decks (Deck A lime / Deck B violet)
- Animated fake waveforms (canvas)
- Play / pause / cue, crossfader
- AI Stems panel — Vocals / Drums / Bass / Other faders that mute waveform layers
- AI Setlist strip with sample tracks + Spotify / Apple badges
- Harmonic match + energy toggles, AI Mode toggle
- Responsive; works offline via `file://` or a static server

---

## Next build phases

| Phase | Goal | Details |
|-------|------|---------|
| **A** | Polish HTML prototype | UX polish, keyboard shortcuts, better waveforms |
| **B** | React / Next web app | Componentize decks, state, routing |
| **C** | Stem pipeline | Demucs / ONNX Runtime Web / Core ML on-device |
| **D** | Spotify (then Apple) auth | OAuth browse/cue/metadata only — no DRM mix claims |
| **E** | Expo / React Native | App Store path; Local Mode + Core ML stems |

Full agent prompts and definitions of done: **[docs/HANDOFF.md](docs/HANDOFF.md)**.  
Architecture & constraints: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.  
Product flows: **[docs/PRODUCT.md](docs/PRODUCT.md)**.

---

## Legal / product guardrails

- Do **not** invent or claim legal true-mixing of DRM-protected streams.
- Streaming APIs = catalog, metadata, preview/cue where licensed.
- Real mix + stem split = **Local Mode** (user-owned files) + demo stems for the UI.
- Ship clear UI copy when a track is “cue-only” vs “mix-ready.”

---

## License

UNLICENSED — private scaffold for product development.
