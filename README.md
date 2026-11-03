# The First Crush ❤️ — Website + Android APK starter

A responsive pickup-line app starter with a pink/purple gradient interface, categories, English/Nepali/Hindi lines, copy/share/favorites, local community posts, edit/delete/report actions, profile settings, dark mode, PWA offline shell, an optional Flask + SQLite API, and a Capacitor Android wrapper.

## What is ready now
- `web/`: usable responsive website. It runs without an account or server and saves favorites/profile/community posts in that browser's local storage.
- `backend/`: optional API starter with SQLite, password hashing, expiring bearer sessions, posts CRUD, reports, and favorites.
- `android-wrapper/`: Capacitor configuration to package the web app as an Android APK.
- `app-logo-concept.png`: square cropped app-logo concept for previews; review legibility and make final launcher assets in Android Studio Image Asset tool.
- `logo-showcase.png`: generated promotional concept artwork showing the app identity and screen ideas.

**Important honest limitation:** the current browser UI is local-demo mode. The API is included, but the frontend is not yet wired to it; cross-device shared posts and real login require connecting the UI to the hosted API and deploying it over HTTPS. The report endpoint stores reports; an admin dashboard and moderation workflow still need to be added before public launch. Do not treat this starter as production-ready authentication/moderation.

## 1. Run the website locally

### Easiest: Python static server
Install Python 3, open a terminal in this folder, then:

```bash
cd web
python -m http.server 8080
```

Open `http://localhost:8080` in your browser. On Android, you can run this from Termux after installing Python; for access from another device on the same Wi-Fi, find the phone's LAN IP and open `http://PHONE-IP:8080` (only while the server is running). For internet access, deploy `web/` to a static host such as GitHub Pages, Netlify, or Cloudflare Pages.

### Test installable PWA
Open the hosted HTTPS website in Chrome, then use the browser menu → **Install app** or **Add to Home screen**. PWA installability varies by browser. The service worker caches the web shell; local-storage data remains on that browser/device.

## 2. Run the optional Flask API
Use Python 3.10+ recommended.

```bash
cd backend
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows PowerShell: .venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
```

Set a strong `TFC_SECRET_KEY` environment variable before starting; never use the sample/default secret in a public deployment. Then:

```bash
python app.py
```

Health check: `http://127.0.0.1:5000/api/health`

Example register request:

```bash
curl -X POST http://127.0.0.1:5000/api/register \\
  -H 'Content-Type: application/json' \\
  -d '{"username":"amit","email":"amit@example.com","password":"Use-A-Strong-Password-123"}'
```

Then POST `/api/login` with `{"identity":"amit","password":"Use-A-Strong-Password-123"}`. Send the returned token in `Authorization: Bearer YOUR_TOKEN` for protected routes. Available endpoints are listed below.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/register` | Create account |
| POST | `/api/login` | Login / issue token |
| POST | `/api/logout` | End current session |
| GET | `/api/posts` | Public post feed |
| POST | `/api/posts` | Create a post (auth required) |
| PATCH | `/api/posts/<id>` | Edit your post (auth required) |
| DELETE | `/api/posts/<id>` | Delete your post (auth required) |
| POST | `/api/posts/<id>/report` | Report a post (auth required) |
| GET | `/api/favorites` | Your favorites (auth required) |
| POST | `/api/favorites/<id>` | Toggle favorite (auth required) |

Before public launch: serve behind HTTPS, configure exact allowed origins, use a strong secret, add rate limiting/email verification/password reset, implement admin moderation and account deletion, add privacy/terms pages, backups, logging, and test the API. This starter uses bearer tokens stored as hashes in SQLite but does not yet include rate limiting or email verification.

## 3. Build an Android APK with Capacitor

Prerequisites: Node.js LTS, Android Studio, Android SDK, and Java version supported by your installed Android Gradle Plugin.

From this project folder:

```bash
cd android-wrapper
npm install
npx cap add android
npx cap sync android
npx cap open android
```

In Android Studio, wait for Gradle sync, choose **Build → Build Bundle(s) / APK(s) → Build APK(s)**. The debug APK is usually created at `android/app/build/outputs/apk/debug/app-debug.apk`. Install it on your test phone and test screen sizes, offline behavior, share/copy permissions, and links. To publish, create a signed release build in Android Studio; never share your signing key.

`capacitor.config.json` sets `webDir` to `../web`. Keep that path intact or change it if you reorganize the project. After modifying website files, run `npx cap sync android` again.

## 4. Android build from a phone

Building a modern Capacitor APK entirely on Android/Termux is not the easiest supported path because Android SDK/Gradle/Java setup is demanding. Recommended: edit/run the website on your phone, push the project to GitHub, then build the APK on a computer with Android Studio or in a configured GitHub Actions Android build workflow. This archive does not contain a prebuilt APK; it contains source code and the build configuration.

## 5. Branding

- App name: The First Crush
- Tagline: Your love, your lines, your story.
- Theme: automatic pink/purple gradients with a dark mode toggle.
- The showcase artwork is `logo-showcase.png`. For the Android launcher, prepare a square 1024×1024 icon and generate Android mipmap assets (Android Studio Image Asset tool).

## Folder map

```text
the_first_crush/
├── README.md
├── logo-showcase.png
├── web/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── manifest.json
│   └── sw.js
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── .env.example
└── android-wrapper/
    ├── package.json
    └── capacitor.config.json
```

## Profile photo and cover photo support

The Supabase database now includes `profiles.cover_url` and `profiles.location`.
The web profile editor uploads profile images to the `avatars` bucket and cover
images to the `profile-covers` bucket. Both are public-read image buckets; uploads,
updates, and deletes are restricted to the authenticated user's own folder
(`<auth-user-id>/...`). Images are limited to 5 MB and JPEG, PNG, or WebP.

Apply the migration in `supabase/migrations/202611030001_profile_cover_messages_policy_cleanup.sql`
to a fresh or existing Supabase project before deploying the updated web client.
