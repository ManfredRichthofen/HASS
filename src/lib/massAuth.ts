import { entities } from '#/config/dashboard'
import {
  isMassConfigured,
  type MassConfig,
  massReturnUrl,
  readMassConfig,
  suggestedMassUrl,
  writeMassConfig,
} from '#/lib/massConfig'

type HaConnection = {
  sendMessagePromise: <T>(msg: { type: string; [key: string]: unknown }) => Promise<T>
}

type ConfigEntry = {
  entry_id?: string
  domain?: string
  title?: string
  data?: Record<string, unknown>
}

export type MassEnsureResult =
  | { status: 'ready'; config: MassConfig }
  | { status: 'already'; config: MassConfig }
  | { status: 'unavailable'; reason: string }

function trimSlash(url: string) {
  return url.replace(/\/+$/, '')
}

function isLikelyInternalAddonUrl(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase()
    // Supervisor / docker hostnames are not reachable from the browser or phone.
    return (
      host.includes('music_assistant') ||
      host.includes('music-assistant') ||
      host.startsWith('addon_') ||
      host.startsWith('core-') ||
      host.endsWith('.hassio') ||
      /^172\.30\./.test(host)
    )
  } catch {
    return false
  }
}

async function probeMassApi(url: string, token: string, timeoutMs = 5000): Promise<boolean> {
  const message_id = `hass-ui-ensure-${Date.now()}`
  try {
    const response = await fetch(`${trimSlash(url)}/api`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message_id, command: 'info' }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    return response.ok
  } catch {
    return false
  }
}

function entryUrlAndToken(entry: ConfigEntry): { url?: string; token?: string } {
  const data = entry.data ?? {}
  const url = typeof data.url === 'string' ? trimSlash(data.url) : undefined
  const token =
    typeof data.token === 'string'
      ? data.token
      : typeof data.auth_token === 'string'
        ? data.auth_token
        : undefined
  return { url, token }
}

/**
 * Reuse the Music Assistant credentials already stored in Home Assistant's
 * music_assistant config entry (addon discovery / integration setup).
 * No separate MA sign-in when HA already talks to the server.
 */
export async function ensureMassFromHomeAssistant(
  connection?: HaConnection | null,
): Promise<MassEnsureResult> {
  const existing = readMassConfig()
  if (existing && existing.authMethod !== 'ha_integration') {
    return { status: 'already', config: existing }
  }
  if (existing?.authMethod === 'ha_integration') {
    // Re-validate periodically isn't needed here; trust stored config until API 401.
    return { status: 'already', config: existing }
  }
  if (!connection) {
    return { status: 'unavailable', reason: 'Home Assistant is not connected' }
  }

  let entries: ConfigEntry[] = []
  try {
    entries = await connection.sendMessagePromise<ConfigEntry[]>({
      type: 'config_entries/get',
      domain: 'music_assistant',
    })
  } catch {
    return {
      status: 'unavailable',
      reason: 'Could not read the Music Assistant integration from Home Assistant',
    }
  }

  if (!entries?.length) {
    return {
      status: 'unavailable',
      reason: 'Music Assistant is not set up in Home Assistant',
    }
  }

  const preferred =
    (entities.musicAssistantEntryId
      ? entries.find((entry) => entry.entry_id === entities.musicAssistantEntryId)
      : undefined) ?? entries[0]

  const { url: entryUrl, token } = entryUrlAndToken(preferred)
  if (!token) {
    return {
      status: 'unavailable',
      reason: 'Home Assistant has Music Assistant but did not expose an API token to this app',
    }
  }

  const candidates: string[] = []
  const push = (value?: string | null) => {
    if (!value) return
    const next = trimSlash(value)
    if (!candidates.includes(next)) candidates.push(next)
  }

  const envUrl = (import.meta.env.VITE_MA_URL as string | undefined)?.trim()
  push(envUrl)
  // Prefer a client-reachable URL: addon internal hosts are not usable from the browser.
  if (entryUrl && !isLikelyInternalAddonUrl(entryUrl)) push(entryUrl)
  push(suggestedMassUrl())
  if (entryUrl) push(entryUrl)

  const discovered = await discoverMassUrl(connection)
  push(discovered)

  for (const candidate of candidates) {
    if (!(await probeMassUrl(candidate))) continue
    if (!(await probeMassApi(candidate, token))) continue
    const config: MassConfig = {
      url: candidate,
      token,
      authMethod: 'ha_integration',
      obtainedAt: new Date().toISOString(),
    }
    writeMassConfig(config)
    return { status: 'ready', config }
  }

  return {
    status: 'unavailable',
    reason: 'Found Music Assistant in Home Assistant, but could not reach its API from this device',
  }
}

export function massAuthLabel(method?: MassConfig['authMethod'] | null) {
  switch (method) {
    case 'ha_integration':
      return 'Using Home Assistant integration'
    case 'ha_oauth':
      return 'Signed in with Home Assistant'
    case 'env':
      return 'Configured via environment'
    case 'token':
      return 'Connected with access token'
    default:
      return isMassConfigured() ? 'Connected' : 'Not connected'
  }
}

/** Probe a candidate MA base URL via the public `/info` endpoint. */
export async function probeMassUrl(url: string, timeoutMs = 3500): Promise<boolean> {
  const base = trimSlash(url)
  try {
    const response = await fetch(`${base}/info`, {
      method: 'GET',
      signal: AbortSignal.timeout(timeoutMs),
    })
    return response.ok
  } catch {
    return false
  }
}

/** Discover Music Assistant base URL from HA config entry and/or common guesses. */
export async function discoverMassUrl(connection?: HaConnection | null): Promise<string | null> {
  const candidates: string[] = []

  if (connection) {
    try {
      const entries = await connection.sendMessagePromise<ConfigEntry[]>({
        type: 'config_entries/get',
        domain: 'music_assistant',
      })
      for (const entry of entries ?? []) {
        if (entities.musicAssistantEntryId && entry.entry_id === entities.musicAssistantEntryId) {
          const url = entry.data?.url
          if (typeof url === 'string' && url) candidates.unshift(trimSlash(url))
        } else {
          const url = entry.data?.url
          if (typeof url === 'string' && url) candidates.push(trimSlash(url))
        }
      }
    } catch {
      /* config entry lookup not available */
    }
  }

  const suggested = suggestedMassUrl()
  if (!candidates.includes(suggested)) candidates.push(suggested)

  // Also try same host as HA on :8095 / without port swap already covered.
  try {
    const envUrl = (import.meta.env.VITE_MA_URL as string | undefined)?.trim()
    if (envUrl) candidates.unshift(trimSlash(envUrl))
  } catch {
    /* ignore */
  }

  for (const candidate of candidates) {
    if (await probeMassUrl(candidate)) return candidate
  }
  return candidates[0] ?? null
}

export type MassLoginProvider = {
  id: string
  name?: string
  type?: string
  requires_redirect?: boolean
}

export async function fetchMassAuthProviders(maUrl: string): Promise<MassLoginProvider[]> {
  const response = await fetch(`${trimSlash(maUrl)}/auth/providers`, {
    method: 'GET',
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) {
    throw new Error(`Could not load Music Assistant login providers (HTTP ${response.status})`)
  }
  const data = (await response.json()) as MassLoginProvider[] | { providers?: MassLoginProvider[] }
  if (Array.isArray(data)) return data
  return data.providers ?? []
}

export function hasHomeAssistantProvider(providers: MassLoginProvider[]) {
  return providers.some(
    (provider) =>
      provider.id === 'homeassistant' ||
      provider.type === 'homeassistant' ||
      /home\s*assistant/i.test(provider.name ?? ''),
  )
}

/**
 * Start Music Assistant's Home Assistant OAuth flow.
 * Opens a popup; resolves with the MA access token when complete.
 */
const PENDING_URL_KEY = 'mass-oauth-pending-url'

export function rememberMassUrlForOAuth(maUrl: string) {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(PENDING_URL_KEY, trimSlash(maUrl))
}

export function takePendingMassUrl() {
  if (typeof sessionStorage === 'undefined') return null
  const value = sessionStorage.getItem(PENDING_URL_KEY)
  sessionStorage.removeItem(PENDING_URL_KEY)
  return value
}

export async function loginMassWithHomeAssistant(maUrl: string): Promise<string> {
  const base = trimSlash(maUrl)
  rememberMassUrlForOAuth(base)
  const returnUrl = massReturnUrl()

  const authorizeResponse = await fetch(
    `${base}/auth/authorize?provider_id=homeassistant&return_url=${encodeURIComponent(returnUrl)}`,
    { method: 'GET', signal: AbortSignal.timeout(10_000) },
  )
  if (!authorizeResponse.ok) {
    const text = await authorizeResponse.text().catch(() => '')
    throw new Error(text || `Authorize failed (HTTP ${authorizeResponse.status})`)
  }

  const payload = (await authorizeResponse.json()) as {
    authorization_url?: string | null
    error?: string
  }
  if (!payload.authorization_url) {
    throw new Error(payload.error || 'Home Assistant login is not available on this MA server')
  }

  return waitForOAuthToken(payload.authorization_url)
}

function waitForOAuthToken(authorizationUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const popup = window.open(
      authorizationUrl,
      'mass-ha-oauth',
      'popup=yes,width=520,height=720,menubar=no,toolbar=no',
    )

    if (!popup) {
      // Popup blocked — fall back to full-page redirect (URL already remembered).
      window.location.assign(authorizationUrl)
      reject(new Error('Redirecting to Home Assistant…'))
      return
    }

    let settled = false
    const cleanup = () => {
      window.removeEventListener('message', onMessage)
      window.clearInterval(pollId)
      window.clearTimeout(timeoutId)
    }

    const finish = (token: string | null, error?: string) => {
      if (settled) return
      settled = true
      cleanup()
      try {
        popup.close()
      } catch {
        /* ignore */
      }
      if (token) resolve(token)
      else reject(new Error(error || 'Music Assistant sign-in was cancelled'))
    }

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; token?: string } | null
      if (data?.type !== 'oauth_success' || typeof data.token !== 'string') return
      finish(data.token)
    }

    window.addEventListener('message', onMessage)

    const pollId = window.setInterval(() => {
      if (popup.closed) {
        finish(null, 'Sign-in window closed before completing')
        return
      }
      try {
        const href = popup.location.href
        if (!href || href === 'about:blank') return
        const url = new URL(href)
        if (url.searchParams.get('mass_oauth') !== '1') return
        const code = url.searchParams.get('code')
        if (code) finish(code)
      } catch {
        // Cross-origin until it lands back on our app.
      }
    }, 400)

    const timeoutId = window.setTimeout(() => {
      finish(null, 'Sign-in timed out')
    }, 5 * 60_000)
  })
}

/** Persist a token from the OAuth return URL (`?mass_oauth=1&code=...`). */
export function consumeMassOAuthReturn(search: string, maUrl?: string | null): MassConfig | null {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  if (params.get('mass_oauth') !== '1') return null
  const code = params.get('code')
  if (!code) return null

  const existing = readMassConfig()
  const url = trimSlash(maUrl || takePendingMassUrl() || existing?.url || suggestedMassUrl())
  const config: MassConfig = {
    url,
    token: code,
    authMethod: 'ha_oauth',
    obtainedAt: new Date().toISOString(),
  }
  writeMassConfig(config)

  // Clean the sensitive token out of the address bar.
  if (typeof window !== 'undefined') {
    const next = new URL(window.location.href)
    next.searchParams.delete('mass_oauth')
    next.searchParams.delete('code')
    window.history.replaceState({}, '', `${next.pathname}${next.search}${next.hash}`)
  }

  return config
}

export function clearMassAuth() {
  writeMassConfig(null)
}
