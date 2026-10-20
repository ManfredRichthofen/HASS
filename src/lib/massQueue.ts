import type { QueueItem } from '#/lib/musicAssistant'

/** Flat item shape returned by `mass_queue.get_queue_items`. */
export type MassQueueServiceItem = {
  queue_item_id?: string
  media_title?: string
  media_album_name?: string
  media_artist?: string
  media_content_id?: string
  media_image?: string | null
  local_image_encoded?: string | null
  duration?: number | null
  name?: string
  index?: number
}

type ServiceResponseBag =
  | { response?: Record<string, unknown> }
  | { service_response?: Record<string, unknown> }
  | Record<string, unknown>

export function normalizeMassQueueItem(raw: MassQueueServiceItem, index: number): QueueItem {
  const title = raw.media_title?.trim() || raw.name?.trim() || undefined
  const artist = raw.media_artist?.trim() || undefined
  const imageUrl = raw.local_image_encoded || raw.media_image || null

  return {
    queue_item_id: raw.queue_item_id,
    name: title,
    index: typeof raw.index === 'number' ? raw.index : index,
    duration: typeof raw.duration === 'number' ? raw.duration : null,
    media_title: title,
    media_artist: artist,
    media_image: imageUrl,
    local_image_encoded: raw.local_image_encoded ?? null,
    media_item: {
      name: title,
      uri: raw.media_content_id,
      artists: artist ? [{ name: artist }] : undefined,
      album: raw.media_album_name ? { name: raw.media_album_name } : undefined,
      image: imageUrl ? { url: imageUrl, path: imageUrl } : null,
    },
  }
}

/** Parse `mass_queue.get_queue_items` service response into QueueItem[]. */
export function parseMassQueueItemsResponse(response: unknown, entityId: string): QueueItem[] {
  if (!response || typeof response !== 'object') return []

  const wrapped = response as ServiceResponseBag
  const map =
    'response' in wrapped || 'service_response' in wrapped
      ? ((wrapped as { response?: Record<string, unknown> }).response ??
        (wrapped as { service_response?: Record<string, unknown> }).service_response ??
        {})
      : (wrapped as Record<string, unknown>)

  const bucket = map[entityId] ?? map[Object.keys(map)[0] ?? '']
  if (Array.isArray(bucket)) {
    return bucket.map((item, index) =>
      normalizeMassQueueItem((item ?? {}) as MassQueueServiceItem, index),
    )
  }

  // Some call paths return the array directly.
  if (Array.isArray(response)) {
    return response.map((item, index) =>
      normalizeMassQueueItem((item ?? {}) as MassQueueServiceItem, index),
    )
  }

  return []
}

export const massQueueEntityData = (entityId: string) => ({
  entity: entityId,
  entity_id: entityId,
})
