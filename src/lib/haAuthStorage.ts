import { haUrl } from '#/config/ha'

const STORAGE_KEY = 'hass-react-auth'

export type HaStoredAuth = {
  access_token: string
  refresh_token?: string
  expires_at?: number
  hassUrl: string
  created_at: number
  client_id?: string | null
}

/** Reads OAuth tokens persisted by hass-react (`hass-react-auth`). */
export function readHaAuth(url = haUrl): HaStoredAuth | null {
  if (!url || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, HaStoredAuth>
    const exact = parsed[url] ?? parsed[url.replace(/\/$/, '')]
    if (exact?.access_token) return exact

    // Fallback: first entry matching host
    const host = new URL(url).host
    for (const value of Object.values(parsed)) {
      if (!value?.access_token || !value.hassUrl) continue
      try {
        if (new URL(value.hassUrl).host === host) return value
      } catch {
        /* ignore */
      }
    }
    return null
  } catch {
    return null
  }
}

export function getHaClientId(auth: HaStoredAuth | null): string {
  if (auth?.client_id) return auth.client_id
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}
