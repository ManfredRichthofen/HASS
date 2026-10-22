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

Location is posted to a **per-device trigger-based Template device_tracker** webhook — Home Assistant’s recommended replacement for deprecated `device_tracker.see`.

Each person/phone gets its own webhook + tracker (e.g. phone named “Pixel 8” → webhook `casa_pixel_8`, entity `device_tracker.pixel_8`). Open **Settings → This device** in the app for the exact YAML for that install.

Example (your snippet will differ):

```yaml
template:
  - triggers:
      - trigger: webhook
        webhook_id: casa_pixel_8
        allowed_methods:
          - POST
        local_only: false
    device_tracker:
      - name: "Pixel 8"
        unique_id: casa_location_pixel_8
        default_entity_id: device_tracker.pixel_8
        latitude: "{{ trigger.json.latitude }}"
        longitude: "{{ trigger.json.longitude }}"
        location_accuracy: "{{ trigger.json.gps_accuracy | default(0) }}"
        attributes:
          battery: "{{ trigger.json.battery }}"
          host_name: "{{ trigger.json.host_name }}"
          device_id: "{{ trigger.json.device_id }}"
```

Then:

1. Sign in to Home Assistant in the app.
2. Paste that device’s Template YAML into HA (or create a Template helper).
3. Open **Settings → This device → Enable location based automations**.
4. Assign that phone’s `device_tracker.*` entity to the correct Person.

See: https://www.home-assistant.io/integrations/template/#device-tracker

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
