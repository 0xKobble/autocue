# YouTube Music / Google Connect

Autocue’s **Sources → YouTube Music** panel uses a Google Play Music–inspired **Library / Playlists / Recents** browser.

All YouTube / YouTube Music tracks stay **cue-only** (`mixReady: false`). There is no DRM stream decode and no stem split from YTM.

## Without a Google client ID (default)

1. Open http://localhost:5173  
2. Scroll to **Sources / Library** (or click **Sources** in the top bar)  
3. Click **Connect YouTube Music**  
4. A demo library appears immediately — open a playlist, then **Load A** / **Load B**

Banner copy: *Demo library (set VITE_GOOGLE_CLIENT_ID for your playlists)*.

## With Google OAuth (your playlists)

### 1. Google Cloud

1. Create (or open) a project in [Google Cloud Console](https://console.cloud.google.com/)  
2. Enable **YouTube Data API v3**  
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**  
4. Application type: **Web application**  
5. Authorized JavaScript origins:
   - `http://localhost:5173`
   - (optional) your deployed origin  
6. Copy the **Client ID** (looks like `….apps.googleusercontent.com`)  
7. Configure the OAuth consent screen (External is fine for testing). Add scopes:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/youtube.readonly`

### 2. Local env

```bash
cd web
cp .env.example .env.local
# edit .env.local:
# VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
npm run dev
```

`.env.local` is gitignored (`*.local` / `.env.*`). Never commit client secrets; the Web client ID is public-ish but still keep it out of the repo.

### 3. Connect

1. Hard-refresh the app  
2. **Connect with Google** → grant YouTube readonly  
3. Your playlist titles + video titles load into the GPM-style browser  
4. Badge: **YouTube · cue-only**  
5. **Load A** / **Load B** cues the track onto a deck (no real audio stream)

If Google sign-in fails, Autocue falls back to the demo library so Connect still works.

## SoundCloud

**Connect SoundCloud** opens a mock Likes / Playlists / Stream browser the same way. Real SC OAuth needs a SoundCloud client id (not in repo).

## Honesty

| Source | After Connect | Mix / stems |
|--------|---------------|-------------|
| YouTube Music (demo or Google) | Library browse + cue to deck | No |
| SoundCloud mock | Library browse + cue | Only downloadable mock mirrors |
| Local / Demo | Files / packs | Yes |
| Spotify / Apple | Toggle catalog rows | No |
