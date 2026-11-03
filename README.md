# The First Crush ❤️

**Your love, your lines, your story.**

A responsive pickup-line and social community app with a web client and a native Android app. The project uses Supabase Auth, Postgres, Row Level Security, and Storage for shared online accounts and content.

## Current project status

### Web app
- Email sign-up with OTP verification, email/password login, and password reset.
- Pickup-line categories in English, Nepali, and Hindi.
- Copy, share, favorites, search, surprise line, and theme toggle.
- Supabase-backed community posts with edit, delete, and report actions.
- Profile editor with display name, bio, location, avatar, and cover image.
- Friends, friend requests, public profiles, and online profile information.
- Community post likes and comments.
- In-app notifications for likes, comments, friend requests, follows, and messages.
- Private text messages between accepted friends.
- Responsive layout and PWA offline shell.

### Native Android app
- Native Android sign-in, sign-up, Google sign-in entry, password reset, and session refresh.
- Profile details, avatar and cover uploads, friends and friend requests.
- Create text/photo posts, like posts, profile Photos/Posts/Reels tabs, and follower/following counts.
- In-app notification list and private text messaging between accepted friends.
- Debug APK is built by GitHub Actions on pushes to the default branch.

**Important limits before a public production launch:** Google sign-in requires a configured Google OAuth provider and matching redirect URLs in Supabase. Email delivery and redirect URLs must be tested with your own email/provider settings. The current Android app has a basic text conversation flow; realtime chat, message read receipts, video reel upload/playback, story publishing, admin moderation dashboard, and signed release APK are not yet complete. The generated APK is a debug build and is not Play Store ready.

## Repository layout

- `web/` — responsive website/PWA.
- `android-native/` — native Android app source.
- `android-wrapper/` — optional Capacitor wrapper.
- `backend/` — optional Flask/SQLite prototype; the main online app uses Supabase.
- `supabase/migrations/` — database migrations matching the connected Supabase project.
- `.github/workflows/android-apk.yml` — automated Android debug APK build.

## Supabase setup

The connected project is configured in `web/config.js` using the public Supabase URL and publishable key. A publishable/anon key is intended for client apps; never put a Supabase `service_role` or secret key in the browser or Android app.

The database includes profiles, posts, favorites, reports, friend requests, follows, likes, comments, messages, notifications, and post shares. RLS is enabled on the public application tables. Storage buckets used by the clients include `avatars` and `profile-covers`.

Migrations in this repository:
1. `202611030001_profile_cover_messages_policy_cleanup.sql`
2. `202611030002_social_interactions_notifications_security.sql`
3. `202611030003_message_notifications.sql`
4. `202611030004_profile_follows_and_media_type.sql`

The connected Supabase project has these migrations applied. For a separate Supabase project, review and apply the migrations in order. Do not apply the same DDL manually if the equivalent schema is already present.

## Run the website locally

From the repository root:

```bash
cd web
python -m http.server 8080
```

Open `http://localhost:8080`. For phone testing on the same Wi-Fi, use your computer's LAN IP and port 8080. For internet deployment, host the `web/` directory on an HTTPS static host and set the correct Auth Site URL and redirect URLs in Supabase Authentication settings.

## Get the Android debug APK

1. Open the repository's **Actions** tab.
2. Select **Build The First Crush Native Android APK**.
3. Open the latest successful run on the `main` branch.
4. Under **Artifacts**, download `The-First-Crush-Native-Android-APK`.
5. Extract the ZIP and install `app-debug.apk` on an Android test device. You may need to allow installation from that file manager.

The workflow also runs automatically after pushes to `main`. Artifacts expire according to GitHub's retention setting. The APK is signed with a debug key for testing only. For Play Store release, configure a private release keystore and a separate signed-release workflow; never commit the keystore or passwords.

## Security checklist before public launch

- Enable Supabase leaked-password protection in Authentication security settings.
- Configure and test Google OAuth credentials and redirect URLs if Google sign-in is offered.
- Set the production website URL in Supabase Auth URL configuration.
- Test signup, OTP delivery, reset links, and session persistence on real devices.
- Add rate limits/abuse controls and an admin moderation workflow for reports.
- Publish Terms of Service and Privacy Policy and define account deletion/data retention.
- Test RLS with at least two independent user accounts. Never test only as the database owner.
- Prepare a signed Android release build and test it on multiple Android versions before distribution.

## Branding

- App name: The First Crush
- Tagline: Your love, your lines, your story.
- Visual style: pink/purple gradients with light and dark themes.
