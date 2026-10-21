import { githubRepo } from '#/config/github'
import { isTauri } from '#/lib/deviceLocation'

export type UpdateCheckResult =
  | { status: 'unsupported' }
  | { status: 'upToDate'; version: string }
  | {
      status: 'available'
      version: string
      notes?: string | null
      /** Desktop: Tauri updater. Android: in-app APK download + system installer prompt. */
      install: (onProgress?: (fraction: number | null) => void) => Promise<void>
      /** Android / fallback — open GitHub release page. */
      openRelease?: () => Promise<void>
    }
  | { status: 'error'; message: string }

/** Tauri Android WebView UA always includes Android; desktop shells do not. */
function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false
  return /android/i.test(navigator.userAgent)
}

async function getCurrentVersion(): Promise<string> {
  if (!isTauri()) return '0.0.0'
  try {
    const { getVersion } = await import('@tauri-apps/api/app')
    return await getVersion()
  } catch {
    return '0.0.0'
  }
}

function compareSemver(a: string, b: string): number {
  const pa = a
    .replace(/^v/, '')
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0)
  const pb = b
    .replace(/^v/, '')
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

async function openUrl(url: string): Promise<void> {
  // window.open is a no-op in the Android WebView; hand the URL to the system (browser/downloader).
  try {
    const { openUrl: open } = await import('@tauri-apps/plugin-opener')
    await open(url)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

/** Desktop: official Tauri updater against GitHub `latest.json`. */
async function checkDesktopUpdate(): Promise<UpdateCheckResult> {
  const { check } = await import('@tauri-apps/plugin-updater')
  const { relaunch } = await import('@tauri-apps/plugin-process')
  const update = await check()
  const version = await getCurrentVersion()

  if (!update) {
    return { status: 'upToDate', version }
  }

  return {
    status: 'available',
    version: update.version,
    notes: update.body,
    install: async () => {
      await update.downloadAndInstall()
      await relaunch()
    },
  }
}

/** Android: download the APK in-app (polling native progress), then open the system installer. */
async function downloadAndInstallApk(
  url: string,
  onProgress?: (fraction: number | null) => void,
): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core')
  let polling = true
  const poll = (async () => {
    while (polling) {
      await new Promise((r) => setTimeout(r, 400))
      if (!polling) break
      try {
        const p = await invoke<{ downloaded: number; total: number }>('app_update_progress')
        onProgress?.(p.total > 0 ? p.downloaded / p.total : null)
      } catch {
        /* progress is best-effort */
      }
    }
  })()
  try {
    await invoke('app_update_download', { url })
  } finally {
    polling = false
    await poll
  }
  onProgress?.(1)
  await invoke('app_update_install')
}

/** Android: compare app version to latest GitHub release tag (APK sideload). */
async function checkAndroidGithubRelease(): Promise<UpdateCheckResult> {
  const current = await getCurrentVersion()
  const res = await fetch(githubRepo.apiLatestReleaseUrl, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  // /releases/latest 404s until a non-draft release is published.
  if (res.status === 404) {
    return { status: 'upToDate', version: current }
  }
  if (!res.ok) {
    throw new Error(`GitHub release check failed (${res.status})`)
  }
  const data = (await res.json()) as {
    tag_name?: string
    body?: string
    html_url?: string
    assets?: Array<{ name: string; browser_download_url: string }>
  }
  const remote = (data.tag_name ?? '').replace(/^app-v|^v/, '')
  if (!remote) {
    return { status: 'upToDate', version: current }
  }

  if (compareSemver(remote, current) <= 0) {
    return { status: 'upToDate', version: current }
  }

  const apk = data.assets?.find((a) => a.name.toLowerCase().endsWith('.apk'))
  const releaseUrl = apk?.browser_download_url ?? data.html_url ?? githubRepo.latestReleaseUrl

  return {
    status: 'available',
    version: remote,
    notes: data.body ?? null,
    install: async (onProgress) => {
      if (!apk) {
        await openUrl(releaseUrl)
        return
      }
      await downloadAndInstallApk(apk.browser_download_url, onProgress)
    },
    openRelease: async () => {
      await openUrl(data.html_url ?? githubRepo.latestReleaseUrl)
    },
  }
}

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  if (!isTauri()) {
    return { status: 'unsupported' }
  }

  try {
    if (isAndroid()) {
      return await checkAndroidGithubRelease()
    }
    return await checkDesktopUpdate()
  } catch (e) {
    return {
      status: 'error',
      message: e instanceof Error ? e.message : 'Update check failed',
    }
  }
}
