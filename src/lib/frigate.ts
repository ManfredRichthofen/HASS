import { haUrl } from '#/config/ha'

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

function frigateApiBase(instanceId: string) {
  const base = (haUrl ?? '').replace(/\/$/, '')
  // Single-instance installs omit the client id in notification URLs.
  if (!instanceId || instanceId === 'frigate') {
    return `${base}/api/frigate`
  }
  return `${base}/api/frigate/${encodeURIComponent(instanceId)}`
}

export function frigateThumbnailUrl(eventId: string, instanceId = 'frigate') {
  return `${frigateApiBase(instanceId)}/notifications/${encodeURIComponent(eventId)}/thumbnail.jpg`
}

export function frigateSnapshotUrl(eventId: string, instanceId = 'frigate') {
  return `${frigateApiBase(instanceId)}/notifications/${encodeURIComponent(eventId)}/snapshot.jpg`
}

export function frigateClipUrl(eventId: string, instanceId = 'frigate') {
  return `${frigateApiBase(instanceId)}/notifications/${encodeURIComponent(eventId)}/clip.mp4`
}

export function frigatePreviewUrl(eventId: string, instanceId = 'frigate') {
  return `${frigateApiBase(instanceId)}/notifications/${encodeURIComponent(eventId)}/event_preview.gif`
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
