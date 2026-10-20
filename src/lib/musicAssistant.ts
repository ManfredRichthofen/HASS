export interface MediaSearchItem {
  title: string
  media_class: string
  media_content_type: string
  media_content_id: string
  can_play?: boolean
  can_expand?: boolean
  thumbnail?: string | null
  children?: MediaSearchItem[]
}

type ResultBucket = { version?: number; result?: MediaSearchItem[] }

export interface MediaSearchResponse {
  context?: unknown
  response?: Record<string, ResultBucket>
  service_response?: Record<string, ResultBucket>
}

export type EnqueueMode = 'play' | 'replace' | 'next' | 'replace_next' | 'add'

export const enqueueModes = [
  { id: 'play' as const, label: 'Play', hint: 'Play now' },
  { id: 'next' as const, label: 'Next', hint: 'Play next' },
  { id: 'add' as const, label: 'Queue', hint: 'Add to end' },
]

export interface QueueMediaArtist {
  name?: string
}

export interface QueueMediaItem {
  name?: string
  uri?: string
  media_type?: string
  artists?: QueueMediaArtist[]
  album?: { name?: string } | string | null
  image?: QueueImage | null
}

export interface QueueImage {
  path?: string | null
  url?: string | null
  provider?: string
  remotely_accessible?: boolean
}

export interface QueueItem {
  queue_item_id?: string
  name?: string
  duration?: number | null
  index?: number
  available?: boolean
  image?: QueueImage | null
  media_item?: QueueMediaItem | null
  /** Some HA builds surface a discart_image URL. */
  discart_image?: string | null
}

export interface MusicQueue {
  queue_id?: string
  display_name?: string
  active?: boolean
  items: number
  shuffle_enabled: boolean
  repeat_mode: string
  crossfade_enabled?: boolean
  autoplay_enabled?: boolean
  is_dynamic?: boolean
  current_index: number | null
  elapsed_time: number
  state?: string
  current_item: QueueItem | null
  next_item: QueueItem | null
}

type QueueResponseMap = Record<string, MusicQueue | { queue?: MusicQueue }>

export interface QueueServiceResponse {
  response?: QueueResponseMap
  service_response?: QueueResponseMap
}

export const mediaTargets = [
  { id: 'media_player.all', label: 'Everywhere' },
  { id: 'media_player.living_room', label: 'Living Room' },
  { id: 'media_player.kitchen', label: 'Kitchen' },
] as const

export const mediaClassFilters = [
  { id: 'all', label: 'All' },
  { id: 'track', label: 'Tracks' },
  { id: 'album', label: 'Albums' },
  { id: 'artist', label: 'Artists' },
  { id: 'playlist', label: 'Playlists' },
  { id: 'radio', label: 'Radio' },
] as const

export const repeatModes = ['off', 'all', 'one'] as const
export type RepeatMode = (typeof repeatModes)[number]

export function parseSearchResults(response: unknown, entityId: string): MediaSearchItem[] {
  const data = response as MediaSearchResponse
  const map = data?.response ?? data?.service_response ?? {}
  const bucket = map[entityId] ?? map[Object.keys(map)[0] ?? '']
  const results = bucket?.result
  return Array.isArray(results) ? results : []
}

export function parseQueueResponse(response: unknown, entityId: string): MusicQueue | null {
  const data = response as QueueServiceResponse | QueueResponseMap | MusicQueue
  if (!data || typeof data !== 'object') return null

  const map =
    'response' in data || 'service_response' in data
      ? ((data as QueueServiceResponse).response ??
        (data as QueueServiceResponse).service_response ??
        {})
      : (data as QueueResponseMap)

  const raw = map[entityId] ?? map[Object.keys(map)[0] ?? '']
  if (!raw || typeof raw !== 'object') {
    // Bare queue object (some call paths return it directly).
    if ('current_item' in data || 'items' in data) return normalizeQueue(data as MusicQueue)
    return null
  }

  const nested = 'queue' in raw && raw.queue ? raw.queue : (raw as MusicQueue)
  return normalizeQueue(nested)
}

function normalizeQueue(raw: MusicQueue): MusicQueue {
  return {
    queue_id: raw.queue_id,
    display_name: raw.display_name,
    active: raw.active,
    items: typeof raw.items === 'number' ? raw.items : 0,
    shuffle_enabled: Boolean(raw.shuffle_enabled),
    repeat_mode: typeof raw.repeat_mode === 'string' ? raw.repeat_mode : 'off',
    crossfade_enabled: Boolean(raw.crossfade_enabled),
    autoplay_enabled: Boolean(raw.autoplay_enabled),
    is_dynamic: Boolean(raw.is_dynamic),
    current_index: typeof raw.current_index === 'number' ? raw.current_index : null,
    elapsed_time: typeof raw.elapsed_time === 'number' ? raw.elapsed_time : 0,
    state: raw.state,
    current_item: raw.current_item ?? null,
    next_item: raw.next_item ?? null,
  }
}

export function mediaClassLabel(mediaClass: string) {
  return mediaClass.replace(/_/g, ' ')
}

export function queueItemTitle(item: QueueItem | null | undefined) {
  if (!item) return null
  const mediaName = item.media_item?.name?.trim()
  if (mediaName) return mediaName
  const name = item.name?.trim()
  if (!name) return null
  // MA often stores "Artist - Track" on the queue item name.
  const split = name.split(' - ')
  if (split.length >= 2) return split.slice(1).join(' - ').trim() || name
  return name
}

export function queueItemArtist(item: QueueItem | null | undefined) {
  if (!item) return null
  const artists = item.media_item?.artists
  if (Array.isArray(artists) && artists.length > 0) {
    const names = artists.map((a) => a.name?.trim()).filter(Boolean)
    if (names.length) return names.join(', ')
  }
  const name = item.name?.trim()
  if (!name) return null
  const split = name.split(' - ')
  if (split.length >= 2) return split[0]?.trim() || null
  return null
}

export function queueItemImage(item: QueueItem | null | undefined) {
  if (!item) return null
  if (typeof item.discart_image === 'string' && item.discart_image) return item.discart_image
  return pickImageUrl(item.image) ?? pickImageUrl(item.media_item?.image) ?? null
}

function pickImageUrl(image: QueueImage | null | undefined) {
  if (!image) return null
  if (typeof image.url === 'string' && image.url) return image.url
  if (typeof image.path === 'string' && image.path) {
    if (image.path.startsWith('http') || image.path.startsWith('/')) return image.path
  }
  return null
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function nextRepeatMode(current: string | null | undefined): RepeatMode {
  const normalized = (current ?? 'off').toLowerCase()
  const index = repeatModes.indexOf(normalized as RepeatMode)
  const next = repeatModes[(index + 1) % repeatModes.length]
  return next ?? 'off'
}

export function repeatModeLabel(mode: string | null | undefined) {
  switch ((mode ?? 'off').toLowerCase()) {
    case 'all':
      return 'Repeat all'
    case 'one':
      return 'Repeat one'
    default:
      return 'Repeat off'
  }
}
