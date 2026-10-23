import { clearMassAuth } from '#/lib/massAuth'
import { readMassConfig } from '#/lib/massConfig'
import type { MusicQueue, QueueItem } from '#/lib/musicAssistant'

type MassResultMessage =
  | { message_id: string; result?: unknown }
  | { message_id: string; error_code?: string | number; error?: string; details?: string }

let messageSeq = 0

export class MassApiError extends Error {
  code?: string | number
  constructor(message: string, code?: string | number) {
    super(message)
    this.name = 'MassApiError'
    this.code = code
  }
}

export async function massCommand<T = unknown>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const config = readMassConfig()
  if (!config) {
    throw new MassApiError('Music Assistant is not configured')
  }

  const message_id = `hass-ui-${++messageSeq}`
  const response = await fetch(`${config.url}/api`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify({ message_id, command, args }),
  })

  if (response.status === 401 || response.status === 403) {
    clearMassAuth()
    throw new MassApiError('Music Assistant session expired — sign in again', response.status)
  }

  if (!response.ok) {
    throw new MassApiError(`Music Assistant HTTP ${response.status}`, response.status)
  }

  const payload = (await response.json()) as MassResultMessage
  if ('error' in payload && payload.error) {
    throw new MassApiError(String(payload.error), payload.error_code)
  }
  if ('error_code' in payload && payload.error_code != null && !('result' in payload)) {
    throw new MassApiError(String(payload.details ?? payload.error_code), payload.error_code)
  }

  return (payload as { result: T }).result
}

export async function testMassConnection(url: string, token: string) {
  const message_id = `hass-ui-test-${Date.now()}`
  const response = await fetch(`${url.replace(/\/+$/, '')}/api`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message_id,
      command: 'player_queues/all',
    }),
  })
  if (!response.ok) {
    throw new MassApiError(`HTTP ${response.status}`, response.status)
  }
  const payload = (await response.json()) as MassResultMessage
  if ('error' in payload && payload.error) {
    throw new MassApiError(String(payload.error), payload.error_code)
  }
  return (payload as { result: unknown }).result
}

export function getQueueItems(queueId: string, limit = 500, offset = 0) {
  return massCommand<QueueItem[]>('player_queues/items', {
    queue_id: queueId,
    limit,
    offset,
  })
}

export function getQueue(queueId: string) {
  return massCommand<MusicQueue | null>('player_queues/get', { queue_id: queueId })
}

export function getActiveQueue(playerId: string) {
  return massCommand<MusicQueue | null>('player_queues/get_active_queue', {
    player_id: playerId,
  })
}

export function clearQueue(queueId: string) {
  return massCommand<void>('player_queues/clear', { queue_id: queueId })
}

export function deleteQueueItem(queueId: string, itemIdOrIndex: string | number) {
  return massCommand<void>('player_queues/delete_item', {
    queue_id: queueId,
    item_id_or_index: itemIdOrIndex,
  })
}

/** pos_shift: -1 up, +1 down, 0 play next */
export function moveQueueItem(queueId: string, queueItemId: string, posShift: number) {
  return massCommand<void>('player_queues/move_item', {
    queue_id: queueId,
    queue_item_id: queueItemId,
    pos_shift: posShift,
  })
}

export function moveQueueItemEnd(queueId: string, queueItemId: string) {
  return massCommand<void>('player_queues/move_item_end', {
    queue_id: queueId,
    queue_item_id: queueItemId,
  })
}

export function playQueueIndex(queueId: string, index: number | string) {
  return massCommand<void>('player_queues/play_index', {
    queue_id: queueId,
    index,
  })
}

export function setQueueShuffle(queueId: string, shuffleEnabled: boolean) {
  return massCommand<void>('player_queues/shuffle', {
    queue_id: queueId,
    shuffle_enabled: shuffleEnabled,
  })
}

export function setQueueRepeat(queueId: string, repeatMode: string) {
  return massCommand<void>('player_queues/repeat', {
    queue_id: queueId,
    repeat_mode: repeatMode,
  })
}

/** Keep filling similar tracks when the queue runs low (Endless Mix companion). */
export function setDontStopTheMusic(queueId: string, enabled: boolean) {
  return massCommand<void>('player_queues/dont_stop_the_music', {
    queue_id: queueId,
    dont_stop_the_music_enabled: enabled,
  })
}

export function setQueueAutoplay(queueId: string, autoplayEnabled: boolean) {
  return massCommand<void>('player_queues/autoplay', {
    queue_id: queueId,
    autoplay_enabled: autoplayEnabled,
  })
}
