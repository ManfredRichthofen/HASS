import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useHAConnection, useMediaPlayer, useServiceCall } from 'hass-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { discoverMassUrl, ensureMassFromHomeAssistant } from '#/lib/massAuth'
import {
  clearQueue,
  deleteQueueItem,
  getActiveQueue,
  getQueue,
  getQueueItems,
  moveQueueItem,
  moveQueueItemEnd,
  playQueueIndex,
  setDontStopTheMusic,
  setQueueAutoplay,
  setQueueRepeat,
  setQueueShuffle,
} from '#/lib/massClient'
import { getMassBaseUrl, isMassConfigured, setDiscoveredMassUrl } from '#/lib/massConfig'
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
  /** Endless Mix / Don’t stop the music — similar tracks when the queue runs low. */
  setEndlessMix: (enabled: boolean) => Promise<void>
  /** Display values — optimistic until HA/MA catches up. */
  endlessMixEnabled: boolean
  shuffleEnabled: boolean
  repeatMode: string
}

/** Cache entity_id → unique_id so we don't re-list the registry every poll. */
const playerIdCache = new Map<string, string>()

async function resolvePlayerId(
  connection: HaConnection | null,
  entityId: string,
  attributes: Record<string, unknown>,
): Promise<string | null> {
  const activeQueue = attributes.active_queue
  if (typeof activeQueue === 'string' && activeQueue) return activeQueue

  const cached = playerIdCache.get(entityId)
  if (cached) return cached

  if (!connection) return null
  try {
    const entries = await connection.sendMessagePromise<EntityRegistryEntry[]>({
      type: 'config/entity_registry/list',
    })
    const match = entries.find((entry) => entry.entity_id === entityId)
    if (match?.unique_id) {
      playerIdCache.set(entityId, match.unique_id)
      return match.unique_id
    }
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

type QueueCache = { items: QueueItem[]; queue: MusicQueue | null }

const emptyQueueList = (old: QueueCache | undefined): QueueCache | undefined =>
  old
    ? {
        ...old,
        items: [],
        queue: old.queue
          ? {
              ...old.queue,
              items: 0,
              current_index: null,
              current_item: null,
              next_item: null,
            }
          : old.queue,
      }
    : old

const removeFromQueue = (old: QueueCache | undefined, itemId: string): QueueCache | undefined => {
  if (!old) return old
  const items = old.items.filter((item) => item.queue_item_id !== itemId)
  return {
    ...old,
    items,
    queue: old.queue ? { ...old.queue, items: items.length } : old.queue,
  }
}

const swapQueueItems = (
  old: QueueCache | undefined,
  itemId: string,
  direction: -1 | 1,
): QueueCache | undefined => {
  if (!old) return old
  const index = old.items.findIndex((item) => item.queue_item_id === itemId)
  const swapWith = index + direction
  if (index < 0 || swapWith < 0 || swapWith >= old.items.length) return old
  const items = [...old.items]
  const a = items[index]
  const b = items[swapWith]
  if (!a || !b) return old
  items[index] = b
  items[swapWith] = a
  return { ...old, items }
}

const moveItemNext = (old: QueueCache | undefined, itemId: string): QueueCache | undefined => {
  if (!old) return old
  const index = old.items.findIndex((item) => item.queue_item_id === itemId)
  if (index < 0) return old
  const currentIndex = old.queue?.current_index ?? 0
  const insertAt = Math.min(currentIndex + 1, old.items.length - 1)
  if (index === insertAt) return old
  const items = [...old.items]
  const [item] = items.splice(index, 1)
  if (!item) return old
  const adjusted = index < insertAt ? insertAt - 1 : insertAt
  items.splice(Math.max(0, adjusted), 0, item)
  return { ...old, items }
}

const moveItemToEnd = (old: QueueCache | undefined, itemId: string): QueueCache | undefined => {
  if (!old) return old
  const index = old.items.findIndex((item) => item.queue_item_id === itemId)
  if (index < 0 || index === old.items.length - 1) return old
  const items = [...old.items]
  const [item] = items.splice(index, 1)
  if (!item) return old
  items.push(item)
  return { ...old, items }
}

export function useMusicQueue(entityId: string): MusicQueueState {
  const { callService, callServiceWithResponse } = useServiceCall()
  const { connection, connected } = useHAConnection()
  const player = useMediaPlayer(entityId)
  const queryClient = useQueryClient()
  const [massApiConfigured, setMassApiConfigured] = useState(() => isMassConfigured())
  const [massUrl, setMassUrl] = useState(() => getMassBaseUrl())
  const [massQueueAvailable, setMassQueueAvailable] = useState<boolean | null>(null)
  const [ensuring, setEnsuring] = useState(false)
  const active = player.isPlaying || player.isPaused
  const configured = Boolean(massQueueAvailable) || massApiConfigured

  useEffect(() => {
    const sync = () => {
      setMassApiConfigured(isMassConfigured())
      setMassUrl(getMassBaseUrl())
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

  // Always resolve a MA base URL for artwork (imageproxy), even when mass_queue
  // handles queue mutations and full MA API auth is not required.
  useEffect(() => {
    if (!connected || !connection || massUrl) return
    let cancelled = false
    void discoverMassUrl(connection).then((url) => {
      if (cancelled || !url) return
      setDiscoveredMassUrl(url)
      setMassUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [connected, connection, massUrl])

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
          setDiscoveredMassUrl(result.config.url)
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

  const activeQueueId = (player.attributes as { active_queue?: string }).active_queue

  // Drive freshness from HA media_player state without thrashing the query key.
  useEffect(() => {
    if (!entityId || !connected || massQueueAvailable === null) return
    void queryClient.invalidateQueries({ queryKey: ['music-queue', entityId] })
  }, [
    entityId,
    connected,
    massQueueAvailable,
    player.mediaTitle,
    player.state,
    activeQueueId,
    queryClient,
  ])

  const query = useQuery({
    queryKey: ['music-queue', entityId, massQueueAvailable, massApiConfigured],
    enabled: Boolean(entityId) && connected && massQueueAvailable !== null,
    staleTime: 8_000,
    // HA-driven invalidation above; poll as a backstop.
    refetchInterval: configured ? (active ? 15_000 : 30_000) : active ? 15_000 : 30_000,
    refetchOnWindowFocus: false,
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

      // Primary path: Music Assistant Queue Actions on Home Assistant.
      if (massQueueAvailable) {
        try {
          const [haSettled, itemsSettled] = await Promise.allSettled([
            callServiceWithResponse('music_assistant', 'get_queue', {
              entity_id: entityId,
            }),
            callServiceWithResponse('mass_queue', 'get_queue_items', {
              ...massQueueEntityData(entityId),
              limit: 500,
              limit_before: 50,
              limit_after: 450,
            }),
          ])

          let haQueue: MusicQueue | null = null
          if (haSettled.status === 'fulfilled') {
            haQueue = parseQueueResponse(haSettled.value, entityId)
            if (haQueue?.queue_id) queueId = haQueue.queue_id
          }

          if (itemsSettled.status === 'fulfilled') {
            const items = parseMassQueueItemsResponse(itemsSettled.value, entityId)
            // HA get_queue often omits dont_stop_the_music / autoplay — pull flags from MA when configured.
            let queue = haQueue
            const id = queueId ?? haQueue?.queue_id ?? null
            if (massApiConfigured && id) {
              try {
                const queueRaw = await getActiveQueue(id).catch(() => getQueue(id))
                if (queueRaw) queue = normalizeQueue(queueRaw)
              } catch {
                /* keep haQueue */
              }
            }
            return {
              queueId: queue?.queue_id ?? id,
              queue,
              items: items.length > 0 ? items : queueItemsFromHaSummary(queue),
              haQueueAvailable: Boolean(queue ?? haQueue) || items.length > 0,
              viaMassQueue: true,
            }
          }
        } catch {
          // Fall through to MA API / HA summary.
        }
      }

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
            items:
              Array.isArray(items) && items.length > 0 ? items : queueItemsFromHaSummary(queue),
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
  const queue = query.data?.queue ?? null

  type OptimisticToggles = {
    shuffle?: boolean
    repeat?: string
    endlessMix?: boolean
  }
  const [optimistic, setOptimistic] = useState<OptimisticToggles>({})

  const serverEndless = Boolean(
    queue?.autoplay_enabled || queue?.dont_stop_the_music_enabled || queue?.is_dynamic,
  )
  const serverShuffle = Boolean(player.shuffle ?? queue?.shuffle_enabled ?? false)
  const serverRepeat = String(player.repeat ?? queue?.repeat_mode ?? 'off').toLowerCase()

  // Drop optimistic overrides once HA/MA state matches what the user picked.
  useEffect(() => {
    setOptimistic((prev) => {
      let changed = false
      const next: OptimisticToggles = { ...prev }
      if (prev.endlessMix !== undefined && prev.endlessMix === serverEndless) {
        delete next.endlessMix
        changed = true
      }
      if (prev.shuffle !== undefined && prev.shuffle === serverShuffle) {
        delete next.shuffle
        changed = true
      }
      if (prev.repeat !== undefined && prev.repeat === serverRepeat) {
        delete next.repeat
        changed = true
      }
      return changed ? next : prev
    })
  }, [serverEndless, serverShuffle, serverRepeat])

  const endlessMixEnabled = optimistic.endlessMix ?? serverEndless
  const shuffleEnabled = optimistic.shuffle ?? serverShuffle
  const repeatMode = optimistic.repeat ?? serverRepeat

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['music-queue', entityId] })
  }, [queryClient, entityId])

  const afterMutation = useCallback(() => {
    // Soft refresh — don't block the UI on Music Assistant catching up.
    void refresh()
    window.setTimeout(() => void refresh(), 1_200)
  }, [refresh])

  const patchQueueFlags = useCallback(
    (patch: Partial<MusicQueue>) => {
      queryClient.setQueriesData<{ queue: MusicQueue | null } | undefined>(
        { queryKey: ['music-queue', entityId] },
        (old) =>
          old
            ? {
                ...old,
                queue: old.queue ? { ...old.queue, ...patch } : old.queue,
              }
            : old,
      )
    },
    [entityId, queryClient],
  )

  const patchQueueCache = useCallback(
    (updater: (old: QueueCache | undefined) => QueueCache | undefined) => {
      queryClient.setQueriesData<QueueCache | undefined>(
        { queryKey: ['music-queue', entityId] },
        updater,
      )
    },
    [entityId, queryClient],
  )

  const withOptimisticQueue = useCallback(
    async (
      updater: (old: QueueCache | undefined) => QueueCache | undefined,
      action: () => Promise<void>,
    ) => {
      // Full query keys include player state — snapshot every match so rollback is exact.
      const snapshots = queryClient.getQueriesData<QueueCache>({
        queryKey: ['music-queue', entityId],
      })
      patchQueueCache(updater)
      try {
        await action()
        afterMutation()
      } catch (e) {
        for (const [key, data] of snapshots) {
          queryClient.setQueryData(key, data)
        }
        throw e
      }
    },
    [afterMutation, entityId, patchQueueCache, queryClient],
  )

  const setShuffle = useCallback(
    async (enabled: boolean) => {
      setOptimistic((prev) => ({ ...prev, shuffle: enabled }))
      patchQueueFlags({ shuffle_enabled: enabled })
      try {
        if (massApiConfigured && queueId && !viaMassQueue) {
          await setQueueShuffle(queueId, enabled)
        } else {
          await player.setShuffle(enabled)
        }
        afterMutation()
      } catch (e) {
        setOptimistic((prev) => ({ ...prev, shuffle: !enabled }))
        patchQueueFlags({ shuffle_enabled: !enabled })
        throw e
      }
    },
    [afterMutation, massApiConfigured, patchQueueFlags, player, queueId, viaMassQueue],
  )

  const setRepeat = useCallback(
    async (mode: string) => {
      const previous = repeatMode
      setOptimistic((prev) => ({ ...prev, repeat: mode }))
      patchQueueFlags({ repeat_mode: mode })
      try {
        if (massApiConfigured && queueId && !viaMassQueue) {
          await setQueueRepeat(queueId, mode)
        } else {
          await player.setRepeat(mode)
        }
        afterMutation()
      } catch (e) {
        setOptimistic((prev) => ({ ...prev, repeat: previous }))
        patchQueueFlags({ repeat_mode: previous })
        throw e
      }
    },
    [afterMutation, massApiConfigured, patchQueueFlags, player, queueId, repeatMode, viaMassQueue],
  )

  const setEndlessMix = useCallback(
    async (enabled: boolean) => {
      // Optimistic only — do not patch the query cache. Patching made serverEndless
      // match immediately so the clear-effect dropped optimistic, then HA refetch
      // (often missing dont_stop_the_music) snapped the switch back to off.
      setOptimistic((prev) => ({ ...prev, endlessMix: enabled }))
      try {
        if (massApiConfigured && queueId) {
          try {
            await setDontStopTheMusic(queueId, enabled)
          } catch {
            await setQueueAutoplay(queueId, enabled)
          }
          afterMutation()
          return
        }

        if (!enabled) {
          throw new Error(
            'Turn off Endless Mix from Music Assistant, or connect the Music Assistant API in Settings',
          )
        }

        const attrs = player.attributes as Record<string, unknown>
        const mediaId =
          queue?.current_item?.media_item?.uri?.trim() ||
          (typeof attrs.media_content_id === 'string' ? attrs.media_content_id : null)
        if (!mediaId) {
          throw new Error('Nothing playing to start Endless Mix from')
        }

        const mediaType =
          queue?.current_item?.media_item?.media_type ||
          (typeof attrs.media_content_type === 'string' ? attrs.media_content_type : 'track')

        await callService('music_assistant', 'play_media', {
          entity_id: entityId,
          media_id: mediaId,
          media_type: mediaType,
          enqueue: 'replace',
          radio_mode: true,
        })
        afterMutation()
      } catch (e) {
        setOptimistic((prev) => ({ ...prev, endlessMix: !enabled }))
        throw e
      }
    },
    [
      afterMutation,
      callService,
      entityId,
      massApiConfigured,
      player.attributes,
      queue?.current_item?.media_item?.media_type,
      queue?.current_item?.media_item?.uri,
      queueId,
    ],
  )

  return useMemo(
    () => ({
      queueId,
      queue,
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
      endlessMixEnabled,
      shuffleEnabled,
      repeatMode,
      setShuffle,
      setRepeat,
      setEndlessMix,
      clear: async () => {
        await withOptimisticQueue(emptyQueueList, async () => {
          if (massApiConfigured && queueId && !viaMassQueue) {
            await clearQueue(queueId)
          } else {
            // Full clear via the media player (mass_queue.clear_queue_from_here only drops upcoming).
            await callService('media_player', 'clear_playlist', { entity_id: entityId })
          }
        })
      },
      removeItem: async (itemId: string) => {
        await withOptimisticQueue(
          (old) => removeFromQueue(old, itemId),
          async () => {
            if (viaMassQueue) {
              await callService('mass_queue', 'remove_queue_item', {
                ...massQueueEntityData(entityId),
                queue_item_id: itemId,
              })
            } else {
              if (!queueId) throw new Error('No active Music Assistant queue')
              await deleteQueueItem(queueId, itemId)
            }
          },
        )
      },
      moveUp: async (itemId: string) => {
        await withOptimisticQueue(
          (old) => swapQueueItems(old, itemId, -1),
          async () => {
            if (viaMassQueue) {
              await callService('mass_queue', 'move_queue_item_up', {
                ...massQueueEntityData(entityId),
                queue_item_id: itemId,
              })
            } else {
              if (!queueId) throw new Error('No active Music Assistant queue')
              await moveQueueItem(queueId, itemId, -1)
            }
          },
        )
      },
      moveDown: async (itemId: string) => {
        await withOptimisticQueue(
          (old) => swapQueueItems(old, itemId, 1),
          async () => {
            if (viaMassQueue) {
              await callService('mass_queue', 'move_queue_item_down', {
                ...massQueueEntityData(entityId),
                queue_item_id: itemId,
              })
            } else {
              if (!queueId) throw new Error('No active Music Assistant queue')
              await moveQueueItem(queueId, itemId, 1)
            }
          },
        )
      },
      playNext: async (itemId: string) => {
        await withOptimisticQueue(
          (old) => moveItemNext(old, itemId),
          async () => {
            if (viaMassQueue) {
              await callService('mass_queue', 'move_queue_item_next', {
                ...massQueueEntityData(entityId),
                queue_item_id: itemId,
              })
            } else {
              if (!queueId) throw new Error('No active Music Assistant queue')
              await moveQueueItem(queueId, itemId, 0)
            }
          },
        )
      },
      moveToEnd: async (itemId: string) => {
        await withOptimisticQueue(
          (old) => moveItemToEnd(old, itemId),
          async () => {
            if (viaMassQueue) {
              // mass_queue has no move-to-end; nudge down once as a best-effort.
              await callService('mass_queue', 'move_queue_item_down', {
                ...massQueueEntityData(entityId),
                queue_item_id: itemId,
              })
            } else {
              if (!queueId) throw new Error('No active Music Assistant queue')
              await moveQueueItemEnd(queueId, itemId)
            }
          },
        )
      },
      playIndex: async (index: number | string) => {
        // Playing an item does not reorder the list locally — just fire and soft-refresh.
        if (viaMassQueue) {
          const itemId = typeof index === 'string' ? index : String(index)
          await callService('mass_queue', 'play_queue_item', {
            ...massQueueEntityData(entityId),
            queue_item_id: itemId,
          })
        } else if (massApiConfigured && queueId) {
          await playQueueIndex(queueId, index)
        } else {
          await player.nextTrack()
        }
        afterMutation()
      },
    }),
    [
      afterMutation,
      callService,
      configured,
      ensuring,
      endlessMixEnabled,
      entityId,
      massApiConfigured,
      massQueueAvailable,
      massUrl,
      player,
      queue,
      query.data?.haQueueAvailable,
      query.data?.items,
      query.error,
      query.isFetching,
      query.isLoading,
      queueId,
      refresh,
      repeatMode,
      setEndlessMix,
      setRepeat,
      setShuffle,
      shuffleEnabled,
      viaMassQueue,
      withOptimisticQueue,
    ],
  )
}
