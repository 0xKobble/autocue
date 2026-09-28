# Autocue — Agent Handoff Pack

Paste-ready prompts for **Claude**, **Grok CLI**, **Cursor**, or any coding agent.  
Repo root: `autocue/` · Prototype: `prototype/` · Brand: Void Black / Acid Lime / Violet Pulse.

---

## Master system prompt

Copy everything in the block below as the system / project instruction:

```
You are building Autocue — a music aggregator for cueing & mixing across Spotify, Apple Music, and local files, with on-device AI stem splitting and AI setlists.

Tagline: Cue. Split. Mix. Anywhere.

Brand tokens (strict):
- Void Black #0A0A0B — background
- Acid Lime #B8FF3C — primary / Deck A
- Violet Pulse #7B5CFF — Deck B / AI
- Fog Gray #9A9AA3 — secondary text
- Dual-deck UI; AI stem faders (Vocals / Drums / Bass / Other); AI setlist strip

Architecture (see docs/ARCHITECTURE.md):
- Client layers: UI, Deck Engine, Stem Engine (local ML), Catalog Aggregator, Setlist AI, Audio Graph
- Platforms: Web prototype → React/Next → React Native/Expo
- Stem path: Demucs → ONNX Runtime Web / Core ML (on-device)

CRITICAL LEGAL / PRODUCT CONSTRAINT:
- Do NOT invent, simulate as real, or claim legal true-mixing / stem-splitting of DRM-protected Spotify or Apple Music streams.
- Streaming APIs = OAuth, browse, metadata, licensed preview/cue only.
- Real mix + stem split = Local / Downloaded mode (user-owned files) + shipped demo stems.
- Every Track must expose mixReady; UI must badge cue-only vs mix-ready.
- If a feature needs raw audio, gate it behind mixReady === true.

UX rules:
- Deck A = lime accents; Deck B / AI = violet accents
- Honest banners when a streaming track is cue-only
- Responsive, dark, polished; Fog Gray for secondary labels
- Prefer existing files under prototype/ and docs/; extend don’t reinvent brand

Mock catalog only unless explicitly implementing OAuth against real APIs.
Never commit secrets. Use env vars for client IDs.
```

---

## Brand tokens + UX rules (quick ref)

```css
:root {
  --void: #0A0A0B;
  --lime: #B8FF3C;
  --violet: #7B5CFF;
  --fog: #9A9AA3;
}
```

- Wordmark: **Autocue**
- Tagline near chrome: Cue. Split. Mix. Anywhere.
- Stem faders visually mute waveform layers when down
- Harmonic match + Energy toggles + AI Mode toggle on setlist strip
- No light theme required for v1

---

## Phase prompts

### Phase A — Polish HTML prototype

```
Phase A — Autocue prototype polish

Context: Static dual-deck UI lives in prototype/ (index.html, styles.css, app.js). Brand: Void Black #0A0A0B, Acid Lime #B8FF3C (Deck A), Violet Pulse #7B5CFF (Deck B/AI), Fog Gray #9A9AA3. Tagline: Cue. Split. Mix. Anywhere.

Tasks:
1. Polish layout, spacing, typography; keep no-build, file:// friendly.
2. Improve canvas waveforms; stem faders must mute/show corresponding waveform layers.
3. Ensure play/pause/cue + crossfader work; keep Web Audio oscillators or clicks for feedback.
4. AI Setlist strip with mock tracks + Spotify/Apple badges; Harmonic / Energy / AI Mode toggles.
5. Add keyboard shortcuts (space = play focused deck, Q/W cue, arrows nudge XF) documented in a small help overlay.
6. Responsive down to ~375px width.
7. Do not claim real streaming playback.

Definition of done:
- [ ] prototype opens via file:// or `npm run proto` with polished dual-deck UI
- [ ] Stem faders visibly affect waveform layers
- [ ] Transport + XF + setlist interactions work offline
- [ ] README still accurate; no DRM-mix claims in UI copy
```

---

### Phase B — React web app

```
Phase B — Autocue React / Next web app

Context: Port prototype/ into a React (Next.js or Vite) app. Preserve brand tokens and dual-deck UX. Read docs/ARCHITECTURE.md and docs/PRODUCT.md.

Tasks:
1. Scaffold app with design tokens as CSS variables / theme.
2. Components: Deck, Waveform, Transport, Crossfader, StemPanel, SetlistStrip, TrackBadge (mixReady).
3. State: DeckEngine store (A/B), mock CatalogAggregator, SetlistAI ranking over mock tracks.
4. Audio Graph wrapper around Web Audio (mix-ready mocks + oscillators/demo buffers only).
5. Routes: Deck (main), Library/Search (mock), Settings stub.
6. Explicit Cue-only vs Mix-ready UI states.

Definition of done:
- [ ] `npm run dev` shows Deck View parity with prototype visuals
- [ ] Typed models for Track, DeckState, StemSet, Setlist, Transition
- [ ] mixReady gating enforced in UI + audio load path
- [ ] No real Spotify streaming claimed
```

---

### Phase C — Stem pipeline

```
Phase C — On-device stem pipeline (web first)

Context: Stem Engine must produce Vocals/Drums/Bass/Other for mixReady tracks only. Prefer ONNX Runtime Web path documented in docs/ARCHITECTURE.md. Demo stems OK while model integration is stubbed.

Tasks:
1. Define StemEngine interface: requestStemSet(trackId) → StemSet | error.
2. Reject source !== local|demo with clear DRM_OR_STREAM error; UI copy explains Local Mode.
3. Implement demo/stub path that loads four demo stem buffers and wires GainNodes.
4. Optional: scaffold ONNX worker + progress events (model file may be placeholder).
5. Cache StemSet by content hash + modelVersion.
6. Wire StemPanel faders to Audio Graph gains; waveform layers follow mute state.

Definition of done:
- [ ] mixReady false → split disabled + explanation
- [ ] mixReady true → four stems controllable; audible mute
- [ ] Cache hit path documented/tested
- [ ] No processing of DRM stream URLs
```

---

### Phase D — Spotify auth (browse / cue only)

```
Phase D — Spotify OAuth browse & cue metadata

Context: Catalog Aggregator integrates Spotify Web API with PKCE. Playback of full DRM tracks for remix is OUT OF SCOPE. Previews/metadata/cue only. Apple Music later.

Tasks:
1. PKCE OAuth; store tokens securely; env-based client ID.
2. Search + playlist fetch → normalize to Track with mixReady: false, source: "spotify".
3. UI: load to deck as cue-only; show banner; disable Split; previewUrl if present.
4. Never decode Spotify media for stems or XF true-mix.
5. Document Local Mode workaround in Connections screen.

Definition of done:
- [ ] User can connect Spotify and search
- [ ] Results badge as cue-only; Split disabled
- [ ] No code path stems Spotify audio
- [ ] README/ARCHITECTURE notes updated if behavior changes
```

---

### Phase E — Expo native

```
Phase E — Autocue Expo / React Native

Context: App Store path. Reuse design tokens and models. Local Mode file import + future Core ML stems. MusicKit optional later. DRM constraint unchanged.

Tasks:
1. Expo app shell; Deck View port; stem faders; setlist strip.
2. Local file picker → mixReady tracks; persist library metadata.
3. AVAudioEngine (or expo-av constrained) graph for Local/demo; document limits.
4. Stub Core ML Stem Engine interface; ship demo stems.
5. Offline-capable Local Mode; honest App Store copy (no DRM mix claims).

Definition of done:
- [ ] Runs on iOS simulator/device via Expo
- [ ] Import local audio → deck → stem faders (demo or real)
- [ ] Spotify (if included) remains cue-only
- [ ] Privacy/security: no token logging; sandbox files
```

---

## Definition of done — global checklist

- [ ] Brand tokens respected everywhere
- [ ] Dual decks + stems + setlist present
- [ ] mixReady / Local Mode constraint enforced in code AND copy
- [ ] Docs (PRODUCT, ARCHITECTURE, HANDOFF, README) stay consistent
- [ ] Prototype or app runnable without secret credentials for mock path

---

## Explicit DRM constraint (repeat for agents)

```
DO NOT invent legal mixing of DRM streams.
Workaround: Local Mode (user-owned files) + demo stems for real mixing / AI stems.
Streaming = cue, browse, metadata, licensed preview only.
```

---

## Suggested first message to an agent

```
Read README.md, docs/PRODUCT.md, docs/ARCHITECTURE.md, and docs/HANDOFF.md.
Then execute Phase A (polish the HTML prototype in prototype/).
Follow the master system prompt brand + DRM constraints.
Report files changed and how to open the prototype.
```

---

## Related

- [PRODUCT.md](./PRODUCT.md)  
- [ARCHITECTURE.md](./ARCHITECTURE.md)  
- [TESTFLIGHT.md](./TESTFLIGHT.md) — iOS TestFlight / EAS  
- [../README.md](../README.md)  
