# KEEP IT UP — Android / Google Play package

A framework-only WebView shell around the shipped single-file game. No native
rewrite, no third-party libraries, no `INTERNET` permission: `assets/index.html`
*is* the product, exactly as served on GitHub Pages and itch.io.

- `applicationId` / namespace: `com.demerest.keepitup`
- `minSdk` 24 (Android 7), `targetSdk`/`compileSdk` 36 (Play's 2026 floor)
- Auto-rotate (no orientation lock); `configChanges` keeps the run alive
  across flips and the game's own resize handling does the rest
- Immersive sticky fullscreen, screen kept on, dark window background
- Bests/badges/skins persist in WebView DOM storage (`setDomStorageEnabled`)
- Launcher icon is vector-only (adaptive icon + pre-26 fallback), same palette
  as the game's default skin

## Build

```
powershell -ExecutionPolicy Bypass -File tools\android-package.ps1
```

The script rebuilds `index.html` from `src/`, copies it into
`app/src/main/assets/`, writes `local.properties`, generates the upload
keystore once (see below), and runs `gradlew bundleRelease`.

Output: `android/app/build/outputs/bundle/release/app-release.aab` — the file
Play Console accepts.

Toolchain (installed 2026-11-04, machine-local, not in git):
Temurin JDK 17 at `C:\Program Files\Eclipse Adoptium\jdk-17.0.21.9-hotspot`,
Android SDK at `C:\Android` (cmdline-tools, `platforms;android-36`,
`build-tools;36.0.0`). Override with `-JavaHome` / `-AndroidHome`.

## Signing — read before losing your laptop

`upload-keystore.p12` + `keystore.properties` are generated once per machine
and are **gitignored on purpose**. Back both up somewhere safe: they sign
every upload. Enroll in Play App Signing when publishing so Google holds the
distribution key and a lost upload key can be reset.

## Play Console notes

- Upload the AAB (not an APK); Play generates the device splits.
- Data safety form: no data collected, no network access, local-only storage.
- Store graphics (512 icon, 1024x500 feature graphic) can be captured from the
  real build with the same rig as `tools/cover.ps1` when the listing is filled in.
- Content rating: none needed beyond the usual questionnaire (no violence
  beyond cartoon saws, no loot boxes, no purchases).
