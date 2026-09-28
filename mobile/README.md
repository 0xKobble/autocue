# Autocue Mobile (Expo)

**Cue. Split. Mix. Anywhere.**

Expo Router app with dual-deck UX, stem panel, setlist strip, brand tokens, and `mixReady` gating. Mock catalog only — no DRM stream mixing.

## Run

```bash
npm install
npx expo start
```

## iOS production / TestFlight

```bash
eas build -p ios --profile production
eas submit -p ios --profile production --latest
```

See [../docs/TESTFLIGHT.md](../docs/TESTFLIGHT.md) for Apple credentials you must supply (`com.kobble.autocue`).
