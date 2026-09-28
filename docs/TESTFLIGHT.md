# Autocue — TestFlight (iOS)

Exact steps to ship the Expo `mobile/` app to **TestFlight**.  
You **must** supply Apple credentials — this repo cannot submit without them.

> **Honest constraint:** Protected Spotify/Apple DRM streams are **not** mixed or stem-split. App Store / TestFlight copy must stay cue-only for streaming and Local/Demo for mix.

---

## What you must provide

| Item | Where | Notes |
|------|-------|-------|
| **Apple Developer Program** membership | [developer.apple.com](https://developer.apple.com) | Paid team ($99/yr) |
| **Apple Team ID** | Developer → Membership | 10-character ID |
| **App Store Connect app** | [appstoreconnect.apple.com](https://appstoreconnect.apple.com) | Create “Autocue” if missing |
| **Bundle ID** | Already set | `com.kobble.autocue` |
| **ASC App ID** (numeric) | App Store Connect → App → App Information | Paste into `mobile/eas.json` → `submit.production.ios.ascAppId` |
| **EAS Project ID** | Created by `eas init` | Paste into `mobile/app.json` → `extra.eas.projectId` |
| **Auth for EAS Submit** (pick one) | | |
| → **ASC API Key** (recommended) | Users and Access → Integrations → App Store Connect API | `.p8` key + Key ID + Issuer ID |
| → **or Apple ID** | Same Apple ID as the Developer account | May require app-specific password |

Optional later: Apple distribution certificate / provisioning — **EAS Manage Credentials** can generate these for you.

---

## 1. Apple Developer + App Store Connect

1. Enroll in the **Apple Developer Program** (if not already).
2. Note your **Team ID** (Membership details).
3. In **App Store Connect** → **My Apps** → **+** → New App:
   - Platform: iOS  
   - Name: **Autocue**  
   - Bundle ID: register `com.kobble.autocue` if needed, then select it  
   - SKU: e.g. `autocue-ios`  
   - Access: Full Access  
4. Open the app → **App Information** → copy the numeric **Apple ID** (this is `ascAppId`).

---

## 2. Install tools & log in

```bash
# Node 20+ recommended (Expo SDK 57)
npm install -g eas-cli
cd mobile
npm install

# Expo / EAS account (create one at expo.dev if needed)
npx expo login
eas login
```

---

## 3. Link EAS project

```bash
cd mobile
eas init
# Accept creating a new project under your Expo account / org
```

Copy the printed **projectId** into `app.json`:

```json
"extra": {
  "eas": {
    "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

Also set `owner` in `app.json` to your Expo username/org if different from `kobble`.

Put the ASC numeric App ID into `eas.json`:

```json
"submit": {
  "production": {
    "ios": {
      "ascAppId": "1234567890"
    }
  }
}
```

---

## 4. Configure credentials (first iOS build)

```bash
cd mobile
eas build:configure   # ensures eas.json is linked
eas credentials -p ios
```

Choose **production** profile. Prefer **Let EAS manage credentials** (distribution cert + provisioning profile).

For submit, configure ASC API key once:

```bash
eas secret:create --name EXPO_ASC_API_KEY_PATH ...   # or use interactive submit prompts
# Or on first `eas submit`, paste Key ID / Issuer ID / path to AuthKey_XXX.p8
```

---

## 5. Production build

```bash
cd mobile
eas build -p ios --profile production
```

- Uses `eas.json` → `build.production`
- Bundle ID: `com.kobble.autocue`
- Wait for the build to finish on Expo servers; download the `.ipa` from the build page if needed.

Local alternative (Mac + Xcode only):

```bash
npx expo prebuild -p ios
npx expo run:ios --device
# Archive & upload via Xcode Organizer (not required if using EAS)
```

---

## 6. Submit to TestFlight

```bash
cd mobile
eas submit -p ios --profile production --latest
```

Or pick a build ID:

```bash
eas submit -p ios --profile production --id <EAS_BUILD_ID>
```

Then in **App Store Connect** → your app → **TestFlight**:

1. Wait for Apple processing (minutes to ~1 hour).
2. Answer export compliance / encryption questions if prompted.
3. Add **Internal Testers** (App Store Connect users) immediately, or **External** (Beta App Review required once).

---

## 7. Checklist before first TestFlight

- [ ] Apple Developer membership active  
- [ ] App created in App Store Connect with bundle `com.kobble.autocue`  
- [ ] `extra.eas.projectId` set in `app.json`  
- [ ] `submit.production.ios.ascAppId` set in `eas.json`  
- [ ] `eas build -p ios --profile production` succeeded  
- [ ] `eas submit` succeeded  
- [ ] Privacy policy URL (required for external TestFlight / App Store) — add when you have one  
- [ ] Screenshots / description draft (needed for App Store; optional for internal TestFlight)  
- [ ] Copy does **not** claim Spotify/Apple DRM true-mix or stem-split  

---

## What’s blocking submit right now

Until the user supplies:

1. Apple Team / Developer account access  
2. ASC App ID + (API key **or** Apple ID auth)  
3. EAS project ID from `eas init`  

…CI and agents **cannot** complete TestFlight upload. The repo is structured for `eas build -p ios` once those values exist.

---

## Related

- Mobile app: [`../mobile/`](../mobile/)  
- EAS profiles: [`../mobile/eas.json`](../mobile/eas.json)  
- Product/DRM: [`ARCHITECTURE.md`](./ARCHITECTURE.md)  
