import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useHAConnection, useMediaPlayer, useServiceCall } from 'hass-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ensureMassFromHomeAssistant } from '#/lib/massAuth'
import {
  clearQueue,
  deleteQueueItem,
  getActiveQueue,
  getQueue,
  getQueueItems,
  moveQueueItem,
  moveQueueItemEnd,
  playQueueIndex,
  setQueueRepeat,
  setQueueShuffle,
} from '#/lib/massClient'
import { isMassConfigured, readMassConfig } from '#/lib/massConfig'
import { massQueueEntityData, parseMassQueueItemsResponse } from '#/lib/massQueue'
import {
  type MusicQueue,
  normalizeQueue,
  parseQueueResponse,
  type QueueItem,
  queueItemsFromHaSummary,
} from '#/lib/musicAssistant'

type EntityRegistryEntry = {
  entity_id: string
  unique_id?: string
  platform?: string
}

type HaConnection = {
  sendMessagePromise: <T>(msg: { type: string; [key: string]: unknown }) => Promise<T>
}

export type MusicQueueState = {
  queueId: string | null
  queue: MusicQueue | null
  items: QueueItem[]
  /** Full queue list/reorder available (mass_queue or MA API). */
  configured: boolean
  /** Using the Home Assistant `mass_queue` integration. */
  viaMassQueue: boolean
  /** HA get_queue (or MA) returned usable queue metadata. */
  haQueueAvailable: boolean
  massUrl: string | null
  loading: boolean
  fetching: boolean
  ensuring: boolean
  error: Error | null
  refresh: () => Promise<void>
  player: ReturnType<typeof useMediaPlayer>
  clear: () => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  moveUp: (itemId: string) => Promise<void>
  moveDown: (itemId: string) => Promise<void>
  playNext: (itemId: string) => Promise<void>
  moveToEnd: (itemId: string) => Promise<void>
  playIndex: (index: number | string) => Promise<void>
  setShuffle: (enabled: boolean) => Promise<void>
  setRepeat: (mode: string) => Promise<void>
}

async function resolvePlayerId(
  connection: HaConnection | null,
  entityId: string,
  attributes: Record<string, unknown>,
): Promise<string | null> {
  const activeQueue = attributes.active_queue
  if (typeof activeQueue === 'string' && activeQueue) return activeQueue

  if (!connection) return null
  try {
    const entries = await connection.sendMessagePromise<EntityRegistryEntry[]>({
      type: 'config/entity_registry/list',
    })
    const match = entries.find((entry) => entry.entity_id === entityId)
    if (match?.unique_id) return match.unique_id
  } catch {
    /* ignore */
  }
  return null
}

async function detectMassQueue(connection: HaConnection | null): Promise<boolean> {
  if (!connection) return false
  try {
    const entries = await connection.sendMessagePromise<unknown[]>({
      type: 'config_entries/get',
      domain: 'mass_queue',
    })
    return Array.isArray(entries) && entries.length > 0
  } catch {
    return false
  }
}

export function useMusicQueue(entityId: string): MusicQueueState {
  const { callService, callServiceWithResponse } = useServiceCall()
  const { connection, connected } = useHAConnection()
  const player = useMediaPlayer(entityId)
  const queryClient = useQueryClient()
  const [massApiConfigured, setMassApiConfigured] = useState(() => isMassConfigured())
  const [massUrl, setMassUrl] = useState(() => readMassConfig()?.url ?? null)
  const [massQueueAvailable, setMassQueueAvailable] = useState<boolean | null>(null)
  const [ensuring, setEnsuring] = useState(false)
  const active = player.isPlaying || player.isPaused
  const configured = Boolean(massQueueAvailable) || massApiConfigured

  useEffect(() => {
    const sync = () => {
      setMassApiConfigured(isMassConfigured())
      setMassUrl(readMassConfig()?.url ?? null)
    }
    window.addEventListener('mass-config-changed', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('mass-config-changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  // Prefer Music Assistant Queue Actions (mass_queue) when installed on HA.
  useEffect(() => {
    if (!connected || !connection) return
    let cancelled = false
    void detectMassQueue(connection).then((available) => {
      if (!cancelled) setMassQueueAvailable(available)
    })
    return () => {
      cancelled = true
    }
  }, [connected, connection])

  // Optional fallback: reuse HA music_assistant integration token for direct MA API.
  useEffect(() => {
    if (!connected || !connection || massApiConfigured) return
    if (massQueueAvailable !== false) return
    let cancelled = false
    setEnsuring(true)
    void ensureMassFromHomeAssistant(connection)
      .then((result) => {
        if (cancelled) return
        if (result.status === 'ready' || result.status === 'already') {
          setMassApiConfigured(true)
          setMassUrl(result.config.url)
          void queryClient.invalidateQueries({ queryKey: ['music-queue'] })
        }
      })
      .finally(() => {
        if (!cancelled) setEnsuring(false)
      })
    return () => {
      cancelled = true
    }
  }, [connected, connection, massApiConfigured, massQueueAvailable, queryClient])

  const query = useQuery({
    queryKey: [
      'music-queue',
      entityId,
      massQueueAvailable,
      massApiConfigured,
      massUrl,
      player.mediaTitle,
      player.state,
      (player.attributes as { active_queue?: string }).active_queue,
    ],
    enabled: Boolean(entityId) && connected && massQueueAvailable !== null,
    staleTime: 2_000,
    refetchInterval: configured ? (active ? 3_000 : 8_000) : active ? 4_000 : 12_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<{
      queueId: string | null
      queue: MusicQueue | null
      items: QueueItem[]
      haQueueAvailable: boolean
      viaMassQueue: boolean
    }> => {
      const attrs = player.attributes as Record<string, unknown>
      let queueId =
        (typeof attrs.active_queue === 'string' && attrs.active_queue) ||
        (await resolvePlayerId(connection, entityId, attrs))

      let haQueue: MusicQueue | null = null
      try {
        const haResponse = await callServiceWithResponse('music_assistant', 'get_queue', {
          entity_id: entityId,
        })
        haQueue = parseQueueResponse(haResponse, entityId)
        if (haQueue?.queue_id) queueId = haQueue.queue_id
      } catch {
        /* idle / no active queue via HA */
      }

      // Primary path: Music Assistant Queue Actions on Home Assistant.
      if (massQueueAvailable) {
        try {
          const itemsResponse = await callServiceWithResponse('mass_queue', 'get_queue_items', {
            ...massQueueEntityData(entityId),
            limit: 500,
            limit_before: 50,
            limit_after: 450,
          })
          const items = parseMassQueueItemsResponse(itemsResponse, entityId)
          return {
            queueId: queueId ?? haQueue?.queue_id ?? null,
            queue: haQueue,
            items: items.length > 0 ? items : queueItemsFromHaSummary(haQueue),
            haQueueAvailable: Boolean(haQueue) || items.length > 0,
            viaMassQueue: true,
          }
        } catch {
          // Fall through to MA API / HA summary.
        }
      }

      if (massApiConfigured && queueId) {
        try {
          const [queueRaw, items] = await Promise.all([
            getActiveQueue(queueId).catch(() => getQueue(queueId)),
            getQueueItems(queueId),
          ])
          const queue = queueRaw ? normalizeQueue(queueRaw) : haQueue
          return {
            queueId: queue?.queue_id ?? queueId,
            queue,
            items: Array.isArray(items) && items.length > 0 ? items : queueItemsFromHaSummary(queue),
            haQueueAvailable: Boolean(queue ?? haQueue),
            viaMassQueue: false,
          }
        } catch {
          /* fall through */
        }
      }

      return {
        queueId: queueId ?? haQueue?.queue_id ?? null,
        queue: haQueue,
        items: queueItemsFromHaSummary(haQueue),
        haQueueAvailable: Boolean(haQueue),
        viaMassQueue: false,
      }
    },
  })

  const queueId = query.data?.queueId ?? null
  const viaMassQueue = Boolean(query.data?.viaMassQueue ?? massQueueAvailable)

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['music-queue', entityId] })
  }, [queryClient, entityId])

  const afterMutation = useCallback(async () => {
    await refresh()
  }, [refresh])

  return useMemo(
    () => ({
      queueId,
      queue: query.data?.queue ?? null,
      items: query.data?.items ?? [],
      configured,
      viaMassQueue,
      haQueueAvailable: Boolean(query.data?.haQueueAvailable ?? query.data?.queue),
      massUrl,
      loading: query.isLoading || ensuring || massQueueAvailable === null,
      fetching: query.isFetching,
      ensuring,
      error:
        query.error instanceof Error
          ? query.error
          : query.error
            ? new Error(String(query.error))
            : null,
      refresh,
      player,
      clear: async () => {
        if (massApiConfigured && queueId && !viaMassQueue) {
          await clearQueue(queueId)
        } else {
          // Full clear via the media player (mass_queue.clear_queue_from_here only drops upcoming).
          await callService('media_player', 'clear_playlist', { entity_id: entityId })
        }
        // Empty the list right away; HA/MA state lags behind the service call.
        queryClient.setQueriesData<{ items: QueueItem[]; queue: MusicQueue | null } | undefined>(
          { queryKey: ['music-queue', entityId] },
          (old) =>
            old
              ? {
                  ...old,
                  items: [],
                  queue: old.queue
                    ? { ...old.queue, items: 0, current_index: null, current_item: null, next_item: null }
                    : old.queue,
                }
              : old,
        )
        window.setTimeout(() => void refresh(), 1_500)
      },
      removeItem: async (itemId: string) => {
        if (viaMassQueue) {
          await callService('mass_queue', 'remove_queue_item', {
            ...massQueueEntityData(entityId),
            queue_item_id: itemId,
          })
        } else {
          if (!queueId) throw new Error('No active Music Assistant queue')
          await deleteQueueItem(queueId, itemId)
        }
        await afterMutation()
      },
      moveUp: async (itemId: string) => {
        if (viaMassQueue) {
          await callService('mass_queue', 'move_queue_item_up', {
            ...massQueueEntityData(entityId),
            queue_item_id: itemId,
          })
        } else {
          if (!queueId) throw new Error('No active Music Assistant queue')
          await moveQueueItem(queueId, itemId, -1)
        }
        await afterMutation()
      },
      moveDown: async (itemId: string) => {
        if (viaMassQueue) {
          await callService('mass_queue', 'move_queue_item_down', {
            ...massQueueEntityData(entityId),
            queue_item_id: itemId,
          })
        } else {
          if (!queueId) throw new Error('No active Music Assistant queue')
          await moveQueueItem(queueId, itemId, 1)
        }
        await afterMutation()
      },
      playNext: async (itemId: string) => {
        if (viaMassQueue) {
          await callService('mass_queue', 'move_queue_item_next', {
            ...massQueueEntityData(entityId),
            queue_item_id: itemId,
          })
        } else {
          if (!queueId) throw new Error('No active Music Assistant queue')
          await moveQueueItem(queueId, itemId, 0)
        }
        await afterMutation()
      },
      moveToEnd: async (itemId: string) => {
        if (viaMassQueue) {
          // mass_queue has no move-to-end; nudge down repeatedly is too harsh — skip via next.
          await callService('mass_queue', 'move_queue_item_down', {
            ...massQueueEntityData(entityId),
            queue_item_id: itemId,
          })
        } else {
          if (!queueId) throw new Error('No active Music Assistant queue')
          await moveQueueItemEnd(queueId, itemId)
        }
        await afterMutation()
      },
      playIndex: async (index: number | string) => {
        if (viaMassQueue) {
          const itemId = typeof index === 'string' ? index : String(index)
          // Prefer queue_item_id when the UI passes one.
          await callService('mass_queue', 'play_queue_item', {
            ...massQueueEntityData(entityId),
            queue_item_id: itemId,
          })
        } else if (massApiConfigured && queueId) {
          await playQueueIndex(queueId, index)
        } else {
          await player.nextTrack()
        }
        await afterMutation()
      },
      setShuffle: async (enabled: boolean) => {
        if (massApiConfigured && queueId && !viaMassQueue) {
          await setQueueShuffle(queueId, enabled)
        } else {
          await player.setShuffle(enabled)
        }
        await afterMutation()
      },
      setRepeat: async (mode: string) => {
        if (massApiConfigured && queueId && !viaMassQueue) {
          await setQueueRepeat(queueId, mode)
        } else {
          await player.setRepeat(mode)
        }
        await afterMutation()
      },
    }),
    [
      afterMutation,
      callService,
      queryClient,
      configured,
      ensuring,
      entityId,
      massApiConfigured,
      massQueueAvailable,
      massUrl,
      player,
      query.data?.haQueueAvailable,
      query.data?.items,
      query.data?.queue,
      query.error,
      query.isFetching,
      query.isLoading,
      queueId,
      refresh,
      viaMassQueue,
    ],
  )
}
