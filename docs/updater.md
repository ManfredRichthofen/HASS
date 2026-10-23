# Casa auto-updates (GitHub Releases)

Desktop builds use the official Tauri updater. It reads:

`https://github.com/ManfredRichthofen/HASS/releases/latest/download/latest.json`

Android cannot use that plugin; the app compares its version to the latest GitHub release, downloads the APK in-app, then opens the system package installer.

## One-time signing setup

A keypair was generated for this machine at:

- Private: `%USERPROFILE%\.tauri\casa.key` (**never commit**)
- Public: already embedded in `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`

### Required repo setting (releases)

**Settings → Actions → General → Workflow permissions → Read and write permissions**

Without this, the APK builds but creating the GitHub Release fails with `Resource not accessible by integration`. After changing it, trigger a **fresh** run (don’t re-run the old one).

Optional: add secret `RELEASE_GITHUB_TOKEN` (classic PAT with `repo` scope) if org policy keeps the default token read-only.

### Secrets

Add GitHub Actions secrets on **ManfredRichthofen/HASS**:

| Secret | Value |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | Full contents of `casa.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Empty if the key has no password |
| `ANDROID_KEY_BASE64` | Base64 of the release keystore |
| `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASSWORD` | Keystore credentials |
| `VITE_HA_URL` | Home Assistant URL baked into the APK (secret or variable) |
| `RELEASE_GITHUB_TOKEN` | Optional PAT with `repo` scope for creating releases |

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
- You can still run the workflow manually (**Actions → Casa release → Run workflow**).

## Android in-app updates

The Android checker offers the latest release APK when the release tag is newer than the installed app version.