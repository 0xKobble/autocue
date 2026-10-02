# YouTube Music / Google Connect

Autocue’s **Sources → YouTube Music** panel uses a Google Play Music–inspired **Library / Playlists / Recents** browser backed by **Google Identity Services** + **YouTube Data API v3**.

All YouTube / YouTube Music tracks stay **cue-only** (`mixReady: false`). There is no DRM stream decode and no stem split from YTM.

**Play works** via the official **YouTube IFrame Player API**: Load A/B cues the video id; **Play** starts the embed (mini players bottom-right). Crossfader fades embed volume. Stems stay disabled.

**Connect never invents a demo library.** Without `VITE_GOOGLE_CLIENT_ID`, the card shows a **Setup required** CTA. With the client ID, Connect runs real Google OAuth only.

## 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create (or select) a project.
2. **APIs & Services → Library** → enable **YouTube Data API v3**.
3. **APIs & Services → OAuth consent screen**
   - User type: **External** (fine for testing)
   - App name / support email as you like
   - Add test users (your Google account) while the app is in Testing
   - Scopes to add:
     - `openid`
     - `email`
     - `profile`
     - `https://www.googleapis.com/auth/youtube.readonly`
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: e.g. `Autocue local`
   - **Authorized JavaScript origins**
     - `http://localhost:5173`
     - (optional) your deployed HTTPS origin
   - Authorized redirect URIs: not required for GIS token client (popup/token flow)
5. Copy the **Client ID** (`….apps.googleusercontent.com`).  
   You do **not** need the client secret for this SPA token flow.

## 2. Local env

```bash
cd web
cp .env.example .env.local
```

Edit `web/.env.local`:

```bash
VITE_GOOGLE_CLIENT_ID=YOUR_ID.apps.googleusercontent.com
```

Restart Vite (`Ctrl+C`, then `npm run dev`). `.env.local` is gitignored — never commit it.

## 3. Connect in the app

1. Open http://localhost:5173 and hard-refresh (Cmd+Shift+R).
2. Scroll to **Sources / Library** (or click **Sources** in the top bar).
3. Click **Connect with Google** → grant YouTube readonly.
4. Your playlist titles + video titles load into the GPM-style browser.
5. Badge: **YouTube · cue-only**. **Load A** / **Load B** cues the video into the official embed.
6. Press **Play** on the deck — you should hear the YouTube audio. Mini players appear bottom-right.
7. If a video blocks embedding (error 101/150), pick another track or use a Local file for mix/stems.

If sign-in fails, Autocue shows the error and stays **disconnected** (no demo fallback).

## Honesty

| Source | After Connect | Mix / stems |
|--------|---------------|-------------|
| YouTube Music (Google) | Real playlists via YouTube Data API · cue to deck | No |
| Local / Demo | Files / packs | Yes |
| Spotify / Apple | Toggle catalog rows | No |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Setup required CTA | `VITE_GOOGLE_CLIENT_ID` missing — set it and restart Vite |
| `origin_mismatch` / blocked popup | Add `http://localhost:5173` under Authorized JavaScript origins |
| Empty playlists | Create playlists in YouTube / YouTube Music, then Disconnect → Connect |
| Play does nothing | Hard-refresh after pull; confirm Load shows “YouTube cued · press Play”; check bottom-right embed; some videos block embed |
| Embed blocked (101/150) | Uploader disabled embedding — try another video or Local file |
| API disabled | Enable **YouTube Data API v3** on the same Cloud project as the OAuth client |
