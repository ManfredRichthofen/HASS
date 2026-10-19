import { githubRepo } from '#/config/github'
import { isTauri } from '#/lib/deviceLocation'

export type UpdateCheckResult =
  | { status: 'unsupported' }
  | { status: 'upToDate'; version: string }
  | {
      status: 'available'
      version: string
      notes?: string | null
      /** Desktop only — ready to downloadAndInstall via Tauri updater. */
      install: () => Promise<void>
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
  window.open(url, '_blank', 'noopener,noreferrer')
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

/** Android: compare app version to latest GitHub release tag (APK sideload). */
async function checkAndroidGithubRelease(): Promise<UpdateCheckResult> {
  const current = await getCurrentVersion()
  const res = await fetch(githubRepo.apiLatestReleaseUrl, {
    headers: { Accept: 'application/vnd.github+json' },
  })
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
    install: async () => {
      await openUrl(releaseUrl)
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
