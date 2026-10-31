# Build APK from GitHub Actions (Android phone friendly)

1. Create a new GitHub repository, e.g. `TheFirstCrush`.
2. Upload the **contents of this `the_first_crush` folder** to the repository root (so `.github`, `web`, and `android-wrapper` are at the root).
3. Open the repository's **Actions** tab. If asked, enable GitHub Actions.
4. Select **Build The First Crush Android APK** from the workflows list.
5. Tap **Run workflow** and run it on `main` (or `master`, depending on the default branch).
6. Wait for the run to finish with a green check mark.
7. Open the completed workflow run, scroll to **Artifacts**, and download `The-First-Crush-debug-apk`.
8. Extract the downloaded artifact ZIP. Install `app-debug.apk` on your Android phone. If Android blocks it, allow installs from that browser/file manager in Android settings, then retry.

This produces a debug/testing APK, not a signed Play Store release. The UI currently uses local browser/device storage; real shared online accounts/posts require deploying and connecting the backend separately.
