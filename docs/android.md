# Casa Android (Tauri v2)

Background location requires the native Android shell. The Cloudflare PWA cannot track GPS when backgrounded.

For GitHub auto-updates (desktop + Android release checks), see [updater.md](./updater.md).

## Prerequisites

- Rust stable 1.90+ (`rustc -V`)
- Android Studio with SDK 34+, NDK, platform-tools
- JDK 17+ (`JAVA_HOME`)
- Emulator or USB device with developer mode

### Environment (Windows PowerShell)

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
```

Confirm:

```powershell
adb devices
rustup target list --installed   # should include aarch64-linux-android
```

## Develop

```powershell
npm install
bun run android:dev     # runs android:patch first (ProGuard + Kotlin)
```

`android:build` also runs `android:patch` automatically so release APKs keep `LocationTrackingPlugin` (R8 would otherwise strip it and the app exits on launch).

On first run, grant **Location → Allow all the time**.

## Background location

Uses Fused Location PendingIntents + WorkManager (no foreground service notification).

1. Sign in to Home Assistant in the app.
2. Open **Settings → This device → Share location**.
3. Minimize / lock the phone — Home Assistant `device_tracker.casa_web_*` should keep updating.
4. Assign that tracker to a Person in HA for presence.

## Release / sideload APK

```powershell
npm run android:build
# or debug (patch first if you skip the npm script):
bun run android:patch
npx tauri android build --debug
```

Debug APK:

`src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`

Install with:

```powershell
adb install -r src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```

Add a release keystore later for Play / durable sideload.

## After regenerating Android project

If you re-run `npx tauri android init`, restore location code:

```powershell
bun run android:patch
```
