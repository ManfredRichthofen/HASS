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
npm run android:patch   # re-apply location service after `tauri android init`
npm run android:dev
```

On first run, grant **Location → Allow all the time** and **Notifications**.

## Background location

1. Sign in to Home Assistant in the app.
2. Open **More → This device → Share location**.
3. Confirm a persistent “Casa is sharing location” notification.
4. Minimize / lock the phone — Home Assistant `device_tracker.casa_web_*` should keep updating.
5. Assign that tracker to a Person in HA for presence.

## Release / sideload APK

```powershell
npm run android:build
# or debug:
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
npm run android:patch
```
