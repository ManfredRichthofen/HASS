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

export function parseSearchResults(
  response: unknown,
  entityId: string,
): MediaSearchItem[] {
  const data = response as MediaSearchResponse
  const map = data?.response ?? data?.service_response ?? {}
  const bucket = map[entityId] ?? map[Object.keys(map)[0] ?? '']
  const results = bucket?.result
  return Array.isArray(results) ? results : []
}

export function mediaClassLabel(mediaClass: string) {
  return mediaClass.replace(/_/g, ' ')
}
