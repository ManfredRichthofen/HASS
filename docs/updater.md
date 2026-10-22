# Casa auto-updates (GitHub Releases)

Desktop builds use the official Tauri updater. It reads:

`https://github.com/ManfredRichthofen/HASS/releases/latest/download/latest.json`

Android cannot use that plugin; the app compares its version to the latest GitHub release and opens the APK asset / release page.

## One-time signing setup

A keypair was generated for this machine at:

- Private: `%USERPROFILE%\.tauri\casa.key` (**never commit**)
- Public: already embedded in `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`

Add GitHub Actions secrets on **ManfredRichthofen/HASS**:

| Secret | Value |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | Full contents of `casa.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Empty if the key has no password |
| `ANDROID_KEY_BASE64` | Base64 of the release keystore |
| `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASSWORD` | Keystore credentials |
| `VITE_HA_URL` | Home Assistant URL baked into the APK (secret or variable) |

Local desktop builds that produce updater artifacts:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "$env:USERPROFILE\.tauri\casa.key" -Raw
npx tauri build
```

## Publish a release (automatic)

Bump `version` in `src-tauri/tauri.conf.json` and push to `main`:

```json
"version": "0.1.4"
```

The **Casa release** workflow detects the version change, builds the Android APK, creates tag `app-v0.1.4`, and publishes a GitHub Release with the APK asset.

Notes:

- Other edits to `tauri.conf.json` that do **not** change `version` are ignored.
- If tag `app-v{version}` already exists, the workflow skips.
- You can still run the workflow manually (**Actions → Casa release → Run workflow**) or push an `app-v*` tag.

## Android in-app updates

The Android checker offers the latest release APK when the release tag is newer than the installed app version.