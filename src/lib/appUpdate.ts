import { invoke } from '@tauri-apps/api/core'
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
    }
  | { status: 'error'; message: string }

type GithubRelease = {
  tag_name?: string
  body?: string
  assets?: Array<{ name: string; browser_download_url: string }>
}

/** Tauri Android WebView UA always includes Android; desktop shells do not. */
const isAndroid = (): boolean => {
  if (typeof navigator === 'undefined') return false
  return /android/i.test(navigator.userAgent)
}

const getCurrentVersion = async (): Promise<string> => {
  if (!isTauri()) return '0.0.0'
  try {
    const { getVersion } = await import('@tauri-apps/api/app')
    return await getVersion()
  } catch {
    return '0.0.0'
  }
}

const compareSemver = (a: string, b: string): number => {
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

const fetchLatestRelease = async (): Promise<GithubRelease | null> => {
  const res = await fetch(githubRepo.apiLatestReleaseUrl, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  // /releases/latest 404s until a non-draft release is published.
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`GitHub release check failed (${res.status})`)
  }
  return (await res.json()) as GithubRelease
}

const findApkAssetUrl = (data: GithubRelease): string | null => {
  const apk = data.assets?.find((a) => a.name.toLowerCase().endsWith('.apk'))
  return apk?.browser_download_url ?? null
}

/** Desktop: official Tauri updater against GitHub `latest.json`. */
const checkDesktopUpdate = async (): Promise<UpdateCheckResult> => {
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
const downloadAndInstallApk = async (
  url: string,
  onProgress?: (fraction: number | null) => void,
): Promise<void> => {
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

/** Android: compare app version to latest GitHub release tag, then download + install the APK. */
const checkAndroidGithubRelease = async (): Promise<UpdateCheckResult> => {
  const current = await getCurrentVersion()
  const data = await fetchLatestRelease()
  if (!data) {
    return { status: 'upToDate', version: current }
  }

  const remote = (data.tag_name ?? '').replace(/^app-v|^v/, '')
  if (!remote) {
    return { status: 'upToDate', version: current }
  }

  if (compareSemver(remote, current) <= 0) {
    return { status: 'upToDate', version: current }
  }

  const apkUrl = findApkAssetUrl(data)
  if (!apkUrl) {
    return {
      status: 'error',
      message: `Version ${remote} is on GitHub but the APK asset is not ready yet. Try again in a minute.`,
    }
  }

  return {
    status: 'available',
    version: remote,
    notes: data.body ?? null,
    install: async (onProgress) => {
      // Re-fetch so install still works if assets finished uploading after the check.
      const latest = await fetchLatestRelease()
      const url = (latest && findApkAssetUrl(latest)) || apkUrl
      await downloadAndInstallApk(url, onProgress)
    },
  }
}

export const checkForAppUpdate = async (): Promise<UpdateCheckResult> => {
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
