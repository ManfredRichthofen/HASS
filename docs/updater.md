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

Local desktop builds that produce updater artifacts:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "$env:USERPROFILE\.tauri\casa.key" -Raw
npx tauri build
```

## Publish a release

1. Bump `version` in `src-tauri/tauri.conf.json` (and optionally `src-tauri/Cargo.toml`).
2. Commit, then tag:

```powershell
git tag app-v0.1.1
git push origin app-v0.1.1
```

3. GitHub Action **Tauri release** builds Windows / Linux / macOS, signs updater artifacts, and drafts a GitHub Release including `latest.json`.
4. Publish the draft release when ready. Installed desktop apps will pick it up on next launch / **More → App updates**.

## Android APKs

Upload a universal APK (from `npm run android:build`) to the same GitHub Release as an asset named `*.apk`. The Android in-app checker will offer that download when the release tag is newer than the installed app version.
