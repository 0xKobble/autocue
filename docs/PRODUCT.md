# Autocue — Product

**Cue. Split. Mix. Anywhere.**

Autocue helps DJs and producers **browse** catalogs across Spotify, Apple Music, and local files; **cue** tracks into dual decks; **split** mix-ready audio into stems on-device; **mix** with crossfader and stem faders; and generate **AI setlists** with harmonic/energy awareness.

---

## Positioning

| Audience | Job to be done |
|----------|----------------|
| Bedroom / mobile DJs | Prep sets from streaming catalogs, mix locally owned files |
| Producers | Isolate stems for remix / practice without leaving the app |
| Live performers | Cue next tracks, see Camelot matches, AI-suggested transitions |

**Not a claim:** Autocue is not a DRM circumvention tool. Streaming = browse / metadata / licensed preview. Mixing & stems = Local / Downloaded + demos.

---

## Core experience flow

```
Browse → Cue → Split → Mix → AI Setlist
```

### 1. Browse

- Unified search across connected sources (Spotify, Apple Music, Local).
- Filters: BPM range, key (Camelot), energy, genre, “mix-ready only.”
- Badges: source (Spotify / Apple / Local), mix-ready vs cue-only.
- Results feed Deck load or Setlist strip.

### 2. Cue

- Load track to Deck A or Deck B.
- Waveform scrub, cue point set, preview (where licensed).
- Cue-only tracks: clear banner — “Streaming: cue & browse. Load Local for full mix.”
- Hot cues (C1–C4) on mix-ready audio.

### 3. Split (Local / Demo only)

- On-device AI stem split: Vocals / Drums / Bass / Other.
- Progress + estimated time; result cached as a `StemSet`.
- Streaming tracks: Split disabled with explanation + “Open Local Mode.”

### 4. Mix

- Dual-deck transport: play, pause, cue, sync, pitch.
- Crossfader with curve options (linear / constant-power / cut).
- Stem faders mute/solo layers in the audio graph.
- Harmonic match indicator (Camelot) + energy compatibility.
- BPM sync when both decks are mix-ready.

### 5. AI Setlist

- Strip of suggested next tracks given current deck key/BPM/energy.
- Toggles: Harmonic match, Energy continuity, AI Mode (creative vs safe).
- One-tap load to empty deck or queue.
- Export setlist metadata (no illegal audio export of DRM).

---

## Screen inventory

| Screen / surface | Purpose | Priority |
|------------------|---------|----------|
| **Home / Library** | Recent, local library, connected services | P0 |
| **Search / Browse** | Cross-catalog search + filters | P0 |
| **Deck View** (main) | Dual decks, waveforms, transport, XF | P0 |
| **Stems Panel** | 4 vertical faders + mute layers | P0 |
| **Setlist Strip** | AI suggestions + manual queue | P0 |
| **Track Detail** | Metadata, key/BPM, mix-ready status | P1 |
| **Connections** | Spotify / Apple OAuth, Local folder | P1 |
| **Local Mode** | Import files, stem jobs, offline cache | P0 (for mix) |
| **Settings** | Crossfade curves, AI prefs, theme | P2 |
| **Onboarding** | Brand, DRM honesty, Local Mode CTA | P1 |

Prototype covers: Deck View + Stems + Setlist Strip (+ mock browse chips).

---

## UX principles

1. **Honesty first** — never imply DRM streams can be mixed like local files.
2. **Deck A = Acid Lime, Deck B / AI = Violet Pulse** — consistent color coding.
3. **One-glance mix readiness** — badge on every track.
4. **Fingers first** — large faders/transport for tablet / future native.
5. **Offline-capable Local Mode** — core mix path works without network.
6. **Void Black canvas** — Fog Gray secondary text; lime/violet for action only.

---

## Success metrics (product)

| Metric | Definition | Target (early) |
|--------|------------|----------------|
| Time-to-first-cue | Open app → first track on a deck | &lt; 60s |
| Mix-ready sessions | Sessions with ≥1 Local/demo mix | Growing share |
| Stem jobs completed | Successful on-device splits | &gt; 80% success |
| Setlist accept rate | AI suggestions loaded to deck | &gt; 25% |
| Cue-only clarity | Users who understand DRM limit (survey / copy test) | &gt; 90% |
| Crash-free Local Mode | Mix sessions without audio graph crash | &gt; 99% |

---

## Competitive notes (lightweight)

- Streaming DJ apps often cue/browse well but stem-split poorly or not at all on-device.
- Stem tools often ignore dual-deck DJ UX and catalog aggregation.
- Autocue’s wedge: **aggregator UX + dual decks + honest Local Mode stems + AI setlists**.

---

## Out of scope (v1)

- Circumventing DRM or claiming Spotify/Apple true-mix.
- Cloud stem processing of user uploads without explicit consent/architecture.
- Full club-grade vinyl emulation / DVS.
- Multi-room / Ableton Link (later).

---

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — systems & models  
- [HANDOFF.md](./HANDOFF.md) — agent prompts & phases  
- [../README.md](../README.md) — repo entry  
