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
  image?: QueueImage | null
  metadata?: { images?: QueueImage[] }
}

export interface QueueMediaItem {
  name?: string
  uri?: string
  media_type?: string
  artists?: QueueMediaArtist[]
  album?:
    | QueueMediaItem
    | { name?: string; image?: QueueImage | null; metadata?: { images?: QueueImage[] } }
    | string
    | null
  image?: QueueImage | null
  metadata?: { images?: QueueImage[] }
}

export interface QueueImage {
  type?: string
  path?: string | null
  url?: string | null
  provider?: string
  remotely_accessible?: boolean
  /** Opaque id for `/imageproxy/<proxy_id>` (MA schema ≥ 31). */
  proxy_id?: string | null
}

export interface QueueItem {
  queue_item_id?: string
  name?: string
  duration?: number | null
  index?: number
  available?: boolean
  image?: QueueImage | null
  media_item?: QueueMediaItem | null
  streamdetails?: {
    stream_metadata?: { image_url?: string | null }
  } | null
  /** Some HA builds surface a discart_image URL. */
  discart_image?: string | null
  /** Flat fields from `mass_queue.get_queue_items`. */
  media_title?: string | null
  media_artist?: string | null
  media_image?: string | null
  local_image_encoded?: string | null
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
  /** MA “Don’t stop the music” — fills similar tracks near end of queue. */
  dont_stop_the_music_enabled?: boolean
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

export function normalizeQueue(raw: MusicQueue): MusicQueue {
  return {
    queue_id: raw.queue_id,
    display_name: raw.display_name,
    active: raw.active,
    items: typeof raw.items === 'number' ? raw.items : 0,
    shuffle_enabled: Boolean(raw.shuffle_enabled),
    repeat_mode: typeof raw.repeat_mode === 'string' ? raw.repeat_mode : 'off',
    crossfade_enabled: Boolean(raw.crossfade_enabled),
    autoplay_enabled: Boolean(raw.autoplay_enabled),
    dont_stop_the_music_enabled: Boolean(raw.dont_stop_the_music_enabled),
    is_dynamic: Boolean(raw.is_dynamic),
    current_index: typeof raw.current_index === 'number' ? raw.current_index : null,
    elapsed_time: typeof raw.elapsed_time === 'number' ? raw.elapsed_time : 0,
    state: raw.state,
    current_item: raw.current_item ?? null,
    next_item: raw.next_item ?? null,
  }
}

/**
 * HA's `music_assistant.get_queue` only returns current + next (items is a count).
 * Build a short preview list so the UI works with HA login alone.
 */
export function queueItemsFromHaSummary(queue: MusicQueue | null | undefined): QueueItem[] {
  if (!queue) return []
  const items: QueueItem[] = []
  if (queue.current_item) {
    items.push({
      ...queue.current_item,
      index: queue.current_index ?? queue.current_item.index ?? 0,
    })
  }
  if (queue.next_item) {
    const nextIndex =
      queue.next_item.index ??
      (typeof queue.current_index === 'number' ? queue.current_index + 1 : items.length)
    items.push({ ...queue.next_item, index: nextIndex })
  }
  return items
}

export function mediaClassLabel(mediaClass: string) {
  return mediaClass.replace(/_/g, ' ')
}

export function queueItemTitle(item: QueueItem | null | undefined) {
  if (!item) return null
  const flatTitle = item.media_title?.trim()
  if (flatTitle) return flatTitle
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
  const flatArtist = item.media_artist?.trim()
  if (flatArtist) return flatArtist
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

const IMAGEPROXY_SIZES = [80, 160, 256, 512, 1024] as const

function normalizeProxySize(size?: number) {
  if (!size || size <= 0) return 0
  for (const allowed of IMAGEPROXY_SIZES) {
    if (size <= allowed) return allowed
  }
  return IMAGEPROXY_SIZES[IMAGEPROXY_SIZES.length - 1]
}

function trimBase(url: string) {
  return url.replace(/\/+$/, '')
}

function pageProtocol() {
  if (typeof window === 'undefined') return 'https'
  return window.location.protocol.replace(':', '')
}

function isMixedContent(url: string) {
  try {
    const protocol = new URL(url).protocol.replace(':', '')
    return protocol === 'http' && pageProtocol() === 'https'
  } catch {
    return false
  }
}

/** Resolve HA `entity_picture` (often `/api/media_player_proxy/...`) against the HA base URL. */
export function resolveHaMediaUrl(path: string | null | undefined, haBaseUrl?: string | null) {
  if (!path) return null
  if (path.startsWith('data:')) return path
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return isMixedContent(path) ? null : path
  }
  if (!haBaseUrl) return path.startsWith('/') ? path : null
  const absolute = `${trimBase(haBaseUrl)}${path.startsWith('/') ? path : `/${path}`}`
  return isMixedContent(absolute) ? null : absolute
}

/**
 * Find the best artwork object on a queue item — mirrors Music Assistant frontend
 * (`getMediaItemImage`): stream art → queue image → media item → album → metadata → artists.
 */
export function findQueueItemImage(
  item: QueueItem | QueueMediaItem | QueueMediaArtist | null | undefined,
  imageType: 'thumb' | 'landscape' = 'thumb',
): QueueImage | null {
  if (!item || typeof item !== 'object') return null

  // QueueItem live radio/stream art
  if ('streamdetails' in item) {
    const live = item.streamdetails?.stream_metadata?.image_url
    if (typeof live === 'string' && live) {
      return {
        type: 'thumb',
        path: live,
        provider: 'builtin',
        remotely_accessible: true,
      }
    }
  }

  // Nested media_item on a QueueItem
  if ('media_item' in item && item.media_item) {
    const nested = findQueueItemImage(item.media_item, imageType)
    if (nested) return nested
  }

  // Direct image matching type
  if ('image' in item && item.image && isUsableImage(item.image)) {
    const type = (item.image.type ?? 'thumb').toLowerCase()
    if (type === imageType || (!item.image.type && imageType === 'thumb')) {
      return item.image
    }
  }

  // Prefer album art for tracks
  if ('album' in item && item.album && typeof item.album === 'object') {
    const albumImage = findQueueItemImage(item.album as QueueMediaItem, imageType)
    if (albumImage) return albumImage
  }

  // metadata.images[]
  if ('metadata' in item && item.metadata?.images) {
    for (const img of item.metadata.images) {
      if (!isUsableImage(img)) continue
      const type = (img.type ?? 'thumb').toLowerCase()
      if (type === imageType) return img
    }
  }

  // Artist fallback
  if ('artists' in item && Array.isArray(item.artists)) {
    for (const artist of item.artists) {
      const artistImage = findQueueItemImage(artist, imageType)
      if (artistImage) return artistImage
    }
  }

  // Landscape fallback from thumb request
  if (imageType === 'thumb') {
    return findQueueItemImage(item, 'landscape')
  }

  // Last resort: any direct image regardless of type
  if ('image' in item && isUsableImage(item.image)) return item.image ?? null

  return null
}

function isUsableImage(image: QueueImage | null | undefined): image is QueueImage {
  if (!image) return false
  return Boolean(image.proxy_id || image.path || image.url)
}

/** Build a browser-loadable URL for a MediaItemImage / QueueImage. */
export function mediaImageUrl(
  image: QueueImage | null | undefined,
  massBaseUrl?: string | null,
  size = 160,
): string | null {
  if (!image) return null
  if (typeof image.url === 'string' && image.url) {
    return absoluteAgainst(image.url, massBaseUrl)
  }
  if (!image.path && !image.proxy_id) return null
  if (image.path?.startsWith('data:')) return image.path

  const normalizedSize = normalizeProxySize(size)
  const needsProxy =
    Boolean(image.proxy_id) ||
    !image.remotely_accessible ||
    Boolean(normalizedSize) ||
    (typeof image.path === 'string' &&
      image.path.includes('://') &&
      image.path.split('://')[0] !== pageProtocol())

  if (needsProxy && image.proxy_id && massBaseUrl) {
    const base = trimBase(massBaseUrl)
    const url = normalizedSize
      ? `${base}/imageproxy/${image.proxy_id}?size=${normalizedSize}`
      : `${base}/imageproxy/${image.proxy_id}`
    return isMixedContent(url) ? null : url
  }

  // Remotely accessible direct URL (Spotify CDN, etc.)
  if (image.remotely_accessible && image.path) {
    return absoluteAgainst(image.path, massBaseUrl)
  }

  // Legacy query-string proxy (older MA servers still accept this)
  if (massBaseUrl && image.provider && image.path) {
    const base = trimBase(massBaseUrl)
    const params = new URLSearchParams({
      provider: image.provider,
      path: image.path,
      size: String(normalizedSize || 160),
    })
    const url = `${base}/imageproxy?${params.toString()}`
    return isMixedContent(url) ? null : url
  }

  if (image.path) return absoluteAgainst(image.path, massBaseUrl)
  return null
}

function absoluteAgainst(path: string, baseUrl?: string | null) {
  if (path.startsWith('data:')) return path
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return isMixedContent(path) ? null : path
  }
  if (!baseUrl) return path.startsWith('/') ? path : null
  const absolute = `${trimBase(baseUrl)}${path.startsWith('/') ? path : `/${path}`}`
  return isMixedContent(absolute) ? null : absolute
}

export function queueItemImage(
  item: QueueItem | null | undefined,
  massBaseUrl?: string | null,
  size = 160,
) {
  if (!item) return null
  if (typeof item.local_image_encoded === 'string' && item.local_image_encoded) {
    return item.local_image_encoded
  }
  if (typeof item.media_image === 'string' && item.media_image) {
    return absoluteAgainst(item.media_image, massBaseUrl)
  }
  if (typeof item.discart_image === 'string' && item.discart_image) {
    return absoluteAgainst(item.discart_image, massBaseUrl)
  }
  const image = findQueueItemImage(item)
  return mediaImageUrl(image, massBaseUrl, size)
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
