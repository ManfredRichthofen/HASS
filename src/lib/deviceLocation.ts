const ENABLED_KEY = 'casa.location.enabled'
const DEVICE_ID_KEY = 'casa.location.device_id'
const LAST_REPORT_KEY = 'casa.location.last_report'

/** True when running inside the Tauri shell (Android / desktop). */
export function isTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  )
}

/** Minimum seconds between HA updates while watching. */
export const LOCATION_MIN_INTERVAL_MS = 60_000

/** Report sooner if the device moved at least this far (meters). */
export const LOCATION_MIN_DISTANCE_M = 50

/** Ignore fixes worse than this (meters). */
export const LOCATION_MAX_ACCURACY_M = 500

export type LocationReportSnapshot = {
  at: number
  lat: number
  lon: number
  accuracy: number | null
  battery: number | null
}

export function isLocationSharingEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) === '1'
  } catch {
    return false
  }
}

export function setLocationSharingEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0')
  } catch {
    /* private mode */
  }
}

/** Stable slug for `device_tracker.<dev_id>` (creates the entity on first see). */
export function getOrCreateLocationDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing && /^[a-z0-9_]+$/.test(existing)) return existing
  } catch {
    /* private mode */
  }

  const id = `casa_web_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`
  try {
    localStorage.setItem(DEVICE_ID_KEY, id)
  } catch {
    /* private mode */
  }
  return id
}

export function readLastLocationReport(): LocationReportSnapshot | null {
  try {
    const raw = localStorage.getItem(LAST_REPORT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LocationReportSnapshot
    if (
      typeof parsed.at !== 'number' ||
      typeof parsed.lat !== 'number' ||
      typeof parsed.lon !== 'number'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeLastLocationReport(snapshot: LocationReportSnapshot): void {
  try {
    localStorage.setItem(LAST_REPORT_KEY, JSON.stringify(snapshot))
  } catch {
    /* private mode */
  }
}

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function shouldReportLocation(
  next: { lat: number; lon: number; accuracy: number | null },
  last: LocationReportSnapshot | null,
  force: boolean,
): boolean {
  if (force) return true
  if (
    next.accuracy != null &&
    next.accuracy > LOCATION_MAX_ACCURACY_M
  ) {
    return false
  }
  if (!last) return true
  const elapsed = Date.now() - last.at
  if (elapsed >= LOCATION_MIN_INTERVAL_MS) return true
  const moved = haversineMeters(last.lat, last.lon, next.lat, next.lon)
  return moved >= LOCATION_MIN_DISTANCE_M
}

export async function readBatteryPercent(): Promise<number | null> {
  try {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number }>
    }
    if (!nav.getBattery) return null
    const battery = await nav.getBattery()
    return Math.round(battery.level * 100)
  } catch {
    return null
  }
}

export function formatCoords(lat: number, lon: number): string {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`
}

export function formatRelativeTime(at: number): string {
  const seconds = Math.round((Date.now() - at) / 1000)
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}
