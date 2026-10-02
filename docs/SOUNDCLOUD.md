# SoundCloud Connect

Autocue connects to **your** SoundCloud account with **OAuth 2.1 Authorization Code + PKCE**. After Connect it loads `/me`, likes, and playlists into a Likes / Playlists / Stream browser.

All SoundCloud tracks stay **cue-only** (`mixReady: false`). Streams are not decoded for stems.

**Connect never invents a mock library.** Without `VITE_SOUNDCLOUD_CLIENT_ID`, the card shows a **Setup required** CTA.

## 1. Register a SoundCloud app

1. Sign in at [SoundCloud](https://soundcloud.com/) (Artist Pro is required for new API keys — see SoundCloud’s current developer policy).
2. Open [Your apps](https://soundcloud.com/you/apps/) (or the SoundCloud developer console / credentials flow SoundCloud documents).
3. Create an application. Copy:
   - **Client ID**
   - **Client Secret** (needed unless SoundCloud marks your app as a *public* client)
4. Set the **Redirect URI** exactly to:

   ```text
   http://localhost:5173/
   ```

   Trailing slash matters — it must match what Autocue sends.

### Public vs confidential client

SoundCloud’s token endpoint historically expects a **client_secret** (confidential client). For a browser SPA:

- **Preferred:** Ask SoundCloud support / API team to mark your app as a **public** client so PKCE works **without** a secret ([discussion](https://github.com/soundcloud/api/issues/365)).
- **Local confidential workaround:** put the secret in `SOUNDCLOUD_CLIENT_SECRET` (non-`VITE_`) in `web/.env.local`. The Vite **`/api/soundcloud/token`** proxy adds it server-side during `npm run dev` / `vite preview` so it is **not** embedded in the JS bundle. Never commit the secret. Do not ship a confidential secret inside a static production host without a real backend.

## 2. Local env

```bash
cd web
cp .env.example .env.local
```

Edit `web/.env.local`:

```bash
VITE_SOUNDCLOUD_CLIENT_ID=your_client_id

# Only if your app is confidential (default today):
SOUNDCLOUD_CLIENT_SECRET=your_client_secret

# Optional override (default = current origin + "/")
# VITE_SOUNDCLOUD_REDIRECT_URI=http://localhost:5173/
```

Restart Vite.

## 3. Connect in the app

1. Open http://localhost:5173 and hard-refresh.
2. **Sources / Library → Connect SoundCloud**.
3. Browser redirects to SoundCloud → approve → returns to `http://localhost:5173/?code=…&state=…`.
4. Autocue exchanges the code (via `/api/soundcloud/token`), loads `/me`, `/me/likes/tracks`, `/me/playlists`, `/me/tracks`, then strips the query params.
5. Browse **Likes / Playlists / Stream** → **Load A** / **Load B** (cue-only).

## Flow details

| Step | Where |
|------|--------|
| PKCE verifier + state | `sessionStorage` |
| Authorize | `https://secure.soundcloud.com/authorize` |
| Token exchange | `POST /api/soundcloud/token` → `https://secure.soundcloud.com/oauth/token` |
| API calls | `https://api.soundcloud.com` with `Authorization: OAuth <token>` |

## Honesty

| Source | After Connect | Mix / stems |
|--------|---------------|-------------|
| SoundCloud (OAuth) | Real likes / playlists · cue to deck | No |
| Local / Demo | Files / packs | Yes |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Setup required CTA | Set `VITE_SOUNDCLOUD_CLIENT_ID` and restart Vite |
| `invalid_client` on token exchange | Add `SOUNDCLOUD_CLIENT_SECRET`, or get the app marked public |
| `redirect_uri` mismatch | Register exactly `http://localhost:5173/` (with slash) |
| State mismatch | Don’t open the redirect URL twice; click Connect again |
| CORS / 401 on API | Confirm token exchange succeeded; check Network tab for `/api/soundcloud/token` |
| Artist Pro / app limit | SoundCloud currently limits API credentials (often one app per person) |
