import { haUrl } from '#/config/ha'
import { readHaAuth } from '#/lib/haAuthStorage'

/** Frigate tracked-object event (subset used by the doorbell popup). */
export type FrigateEvent = {
  id: string
  camera: string
  label: string
  sub_label?: string | string[] | null
  start_time: number
  end_time?: number | null
  has_clip?: boolean
  has_snapshot?: boolean
  top_score?: number
  score?: number
  zones?: string[]
  data?: {
    type?: string
    score?: number
    top_score?: number
    label?: string
  }
}

export function frigateCameraFromEntity(entityId: string) {
  return entityId.replace(/^camera\./, '')
}

/** Frigate HA camera entities expose these on `extra_state_attributes`. */
export function frigateMetaFromCameraAttributes(attributes: Record<string, unknown> | undefined) {
  const cameraName =
    typeof attributes?.camera_name === 'string' && attributes.camera_name
      ? attributes.camera_name
      : null
  const clientId =
    typeof attributes?.client_id === 'string' && attributes.client_id ? attributes.client_id : null
  return { cameraName, clientId }
}

/** Normalize WS/REST event payloads (string JSON unwrap happens in the hook). */
export function normalizeFrigateEvent(raw: unknown): FrigateEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const data =
    e.data && typeof e.data === 'object' ? (e.data as Record<string, unknown>) : undefined
  const id = typeof e.id === 'string' ? e.id : null
  if (!id) return null

  const label =
    (typeof e.label === 'string' && e.label) ||
    (typeof data?.label === 'string' && data.label) ||
    'object'

  const start =
    typeof e.start_time === 'number'
      ? e.start_time
      : typeof e.start_time === 'string'
        ? Number(e.start_time)
        : NaN
  if (!Number.isFinite(start)) return null

  const endRaw = e.end_time
  const end_time =
    typeof endRaw === 'number' ? endRaw : typeof endRaw === 'string' ? Number(endRaw) : null

  return {
    id,
    camera: typeof e.camera === 'string' ? e.camera : '',
    label,
    sub_label: (e.sub_label as FrigateEvent['sub_label']) ?? null,
    start_time: start,
    end_time: Number.isFinite(end_time as number) ? (end_time as number) : null,
    has_clip: Boolean(e.has_clip),
    has_snapshot: Boolean(e.has_snapshot),
    top_score: typeof e.top_score === 'number' ? e.top_score : undefined,
    score: typeof e.score === 'number' ? e.score : undefined,
    zones: Array.isArray(e.zones) ? (e.zones as string[]) : undefined,
    data: data
      ? {
          type: typeof data.type === 'string' ? data.type : undefined,
          score: typeof data.score === 'number' ? data.score : undefined,
          top_score: typeof data.top_score === 'number' ? data.top_score : undefined,
          label: typeof data.label === 'string' ? data.label : undefined,
        }
      : undefined,
  }
}

function frigateApiBase(instanceId: string) {
  const base = (haUrl ?? '').replace(/\/$/, '')
  // Single-instance installs omit the client id in notification URLs.
  if (!instanceId || instanceId === 'frigate') {
    return `${base}/api/frigate`
  }
  return `${base}/api/frigate/${encodeURIComponent(instanceId)}`
}

/** HA REST media needs the user access token for `<img>` / `<video>` (no Authorization header). */
function withHaAuth(url: string) {
  const token = readHaAuth()?.access_token
  if (!token || !url) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}auth=${encodeURIComponent(token)}`
}

export function frigateThumbnailUrl(eventId: string, instanceId = 'frigate') {
  return withHaAuth(
    `${frigateApiBase(instanceId)}/notifications/${encodeURIComponent(eventId)}/thumbnail.jpg`,
  )
}

export function frigateSnapshotUrl(eventId: string, instanceId = 'frigate') {
  return withHaAuth(
    `${frigateApiBase(instanceId)}/notifications/${encodeURIComponent(eventId)}/snapshot.jpg`,
  )
}

export function frigateClipUrl(eventId: string, instanceId = 'frigate') {
  return withHaAuth(
    `${frigateApiBase(instanceId)}/notifications/${encodeURIComponent(eventId)}/clip.mp4`,
  )
}

export function frigatePreviewUrl(eventId: string, instanceId = 'frigate') {
  return withHaAuth(
    `${frigateApiBase(instanceId)}/notifications/${encodeURIComponent(eventId)}/event_preview.gif`,
  )
}

export function eventLabel(event: FrigateEvent) {
  const sub = Array.isArray(event.sub_label)
    ? event.sub_label.filter(Boolean).join(', ')
    : event.sub_label
  const base = (event.label || event.data?.label || 'object').replace(/_/g, ' ')
  return sub ? `${base} · ${sub}` : base
}

export function eventScore(event: FrigateEvent) {
  const raw = event.top_score ?? event.score ?? event.data?.top_score ?? event.data?.score
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
  return Math.round(raw * 100)
}

export function formatEventTime(unixSeconds: number) {
  const date = new Date(unixSeconds * 1000)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatEventRelative(unixSeconds: number, now = Date.now()) {
  const diffSec = Math.round((now - unixSeconds * 1000) / 1000)
  if (!Number.isFinite(diffSec)) return ''
  if (diffSec < 45) return 'just now'
  if (diffSec < 3600) return `${Math.max(1, Math.round(diffSec / 60))}m ago`
  if (diffSec < 86400) return `${Math.max(1, Math.round(diffSec / 3600))}h ago`
  return formatEventTime(unixSeconds)
}
