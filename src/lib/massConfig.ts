import { haUrl } from '#/config/ha'

const STORAGE_KEY = 'mass-api-config'

export type MassAuthMethod = 'ha_oauth' | 'ha_integration' | 'token' | 'env'

export type MassConfig = {
  url: string
  token: string
  authMethod?: MassAuthMethod
  /** ISO timestamp when the token was stored (short-lived HA OAuth tokens). */
  obtainedAt?: string
}

function trimSlash(url: string) {
  return url.replace(/\/+$/, '')
}

export function readMassConfig(): MassConfig | null {
  const envUrl = (import.meta.env.VITE_MA_URL as string | undefined)?.trim()
  const envToken = (import.meta.env.VITE_MA_TOKEN as string | undefined)?.trim()

  let stored: MassConfig | null = null
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<MassConfig>
        if (parsed.url && parsed.token) {
          stored = {
            url: trimSlash(parsed.url),
            token: parsed.token,
            authMethod: parsed.authMethod,
            obtainedAt: parsed.obtainedAt,
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (stored) return stored

  const url = trimSlash(envUrl || '')
  const token = envToken || ''
  if (!url || !token) return null
  return { url, token, authMethod: 'env' }
}

export function writeMassConfig(config: MassConfig | null) {
  if (typeof localStorage === 'undefined') return
  if (!config?.url || !config.token) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      url: trimSlash(config.url),
      token: config.token,
      authMethod: config.authMethod ?? 'token',
      obtainedAt: config.obtainedAt ?? new Date().toISOString(),
    }),
  )
  // Notify other tabs / the queue hook that credentials changed.
  window.dispatchEvent(new CustomEvent('mass-config-changed'))
}

/** Best-effort guess when the user hasn't set a URL yet. */
export function suggestedMassUrl() {
  const envUrl = (import.meta.env.VITE_MA_URL as string | undefined)?.trim()
  if (envUrl) return trimSlash(envUrl)
  if (!haUrl) return 'http://homeassistant.local:8095'
  try {
    const u = new URL(haUrl)
    // Common LAN addon layout — remote reverse proxies usually need an explicit URL.
    if (u.port === '8123' || u.port === '') {
      u.port = '8095'
      u.protocol = u.protocol === 'https:' ? 'https:' : 'http:'
      return trimSlash(u.toString())
    }
  } catch {
    /* ignore */
  }
  return 'http://homeassistant.local:8095'
}

export function isMassConfigured() {
  return readMassConfig() !== null
}

export function massReturnUrl() {
  if (typeof window === 'undefined') return '/'
  return `${window.location.origin}/settings?mass_oauth=1`
}
