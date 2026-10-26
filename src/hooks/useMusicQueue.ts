import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useHAConnection, useMediaPlayer, useServiceCall } from 'hass-react'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
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
  /** How many upcoming items are requested from the server. */
  itemLimit: number
  /** Request another page of upcoming items. */
  loadMore: () => void
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

const QUEUE_PAGE_SIZE = 200
const MASS_QUEUE_FLAG_KEY = 'mass-queue-available'

/** Cache entity_id → unique_id so we don't hit the registry every poll. */
const playerIdCache = new Map<string, string>()

/** Upcoming-item limit per player, shared by every hook instance so they reuse one query. */
const itemLimits = new Map<string, number>()
const itemLimitListeners = new Set<() => void>()

const subscribeItemLimits = (listener: () => void) => {
  itemLimitListeners.add(listener)
  return () => {
    itemLimitListeners.delete(listener)
  }
}

const raiseItemLimit = (entityId: string) => {
  itemLimits.set(entityId, (itemLimits.get(entityId) ?? QUEUE_PAGE_SIZE) + QUEUE_PAGE_SIZE)
  for (const listener of itemLimitListeners) listener()
}

const readCachedMassQueueFlag = (): boolean | undefined => {
  if (typeof localStorage === 'undefined') return undefined
  const value = localStorage.getItem(MASS_QUEUE_FLAG_KEY)
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

const writeCachedMassQueueFlag = (value: boolean) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(MASS_QUEUE_FLAG_KEY, String(value))
}

async function lookupPlayerId(
  connection: HaConnection | null,
  entityId: string,
): Promise<string | null> {
  const cached = playerIdCache.get(entityId)
  if (cached) return cached
  if (!connection) return null
  try {
    const entry = await connection.sendMessagePromise<EntityRegistryEntry>({
      type: 'config/entity_registry/get',
      entity_id: entityId,
    })
    if (entry?.unique_id) {
      playerIdCache.set(entityId, entry.unique_id)
      return entry.unique_id
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
    const available = Array.isArray(entries) && entries.length > 0
    writeCachedMassQueueFlag(available)
    return available
  } catch {
    return false
  }
}

const fetchMaQueue = (queueId: string) => getActiveQueue(queueId).catch(() => getQueue(queueId))

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
    queue: old.queue ? { ...old.queue, items: Math.max(0, old.queue.items - 1) } : old.queue,
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
  const currentId = old.queue?.current_item?.queue_item_id
  const foundCurrent = currentId
    ? old.items.findIndex((item) => item.queue_item_id === currentId)
    : -1
  const currentIndex = foundCurrent >= 0 ? foundCurrent : (old.queue?.current_index ?? 0)
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

type UseMusicQueueOptions = {
  /**
   * The instance that follows HA state and refreshes the shared query. Other
   * instances for the same player only read it, so nothing is fetched twice.
   */
  primary?: boolean
}

export function useMusicQueue(
  entityId: string,
  { primary = true }: UseMusicQueueOptions = {},
): MusicQueueState {
  const { callService, callServiceWithResponse } = useServiceCall()
  const { connection, connected } = useHAConnection()
  const player = useMediaPlayer(entityId)
  const queryClient = useQueryClient()
  const [massApiConfigured, setMassApiConfigured] = useState(() => isMassConfigured())
  const [massUrl, setMassUrl] = useState(() => getMassBaseUrl())
  const active = player.isPlaying || player.isPaused
  const haReady = connected && Boolean(connection)

  const itemLimit = useSyncExternalStore(
    subscribeItemLimits,
    () => itemLimits.get(entityId) ?? QUEUE_PAGE_SIZE,
    () => QUEUE_PAGE_SIZE,
  )

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
  // Last session's answer is used as a placeholder so the queue fetch starts immediately.
  const massQueueQuery = useQuery({
    queryKey: ['mass-queue-available'],
    enabled: haReady,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    placeholderData: readCachedMassQueueFlag,
    queryFn: () => detectMassQueue(connection),
  })
  const massQueueAvailable = massQueueQuery.data ?? null
  const configured = Boolean(massQueueAvailable) || massApiConfigured

  // Resolve a MA base URL for artwork (imageproxy) even when mass_queue handles mutations.
  // Runs once per session; the result is persisted and broadcast via `mass-config-changed`.
  useQuery({
    queryKey: ['mass-url'],
    enabled: haReady && !massApiConfigured,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
    queryFn: async () => {
      const url = await discoverMassUrl(connection)
      if (url) setDiscoveredMassUrl(url)
      return url ?? ''
    },
  })

  // Optional fallback: reuse HA music_assistant integration token for direct MA API.
  const ensureQuery = useQuery({
    queryKey: ['mass-ensure'],
    enabled: haReady && !massApiConfigured && massQueueAvailable === false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
    queryFn: async () => {
      const result = await ensureMassFromHomeAssistant(connection)
      if (result.status === 'ready' || result.status === 'already') {
        setDiscoveredMassUrl(result.config.url)
        setMassApiConfigured(true)
        void queryClient.invalidateQueries({ queryKey: ['music-queue'] })
      }
      return result.status
    },
  })
  const ensuring = ensureQuery.isFetching

  const activeQueueId = (player.attributes as { active_queue?: string }).active_queue

  // Drive freshness from HA media_player state without thrashing the query key.
  useEffect(() => {
    if (!primary || !entityId || !connected || massQueueAvailable === null) return
    void queryClient.invalidateQueries({ queryKey: ['music-queue', entityId] })
  }, [
    primary,
    entityId,
    connected,
    massQueueAvailable,
    massApiConfigured,
    player.mediaTitle,
    player.state,
    activeQueueId,
    queryClient,
  ])

  const query = useQuery({
    queryKey: ['music-queue', entityId, itemLimit],
    enabled: Boolean(entityId) && connected && massQueueAvailable !== null,
    staleTime: 8_000,
    placeholderData: keepPreviousData,
    // HA-driven invalidation above; poll as a backstop.
    refetchInterval: active ? 15_000 : 30_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<{
      queueId: string | null
      queue: MusicQueue | null
      items: QueueItem[]
      haQueueAvailable: boolean
      viaMassQueue: boolean
    }> => {
      const attrs = player.attributes as Record<string, unknown>
      const attrQueueId =
        typeof attrs.active_queue === 'string' && attrs.active_queue ? attrs.active_queue : null

      // Primary path: Music Assistant Queue Actions on Home Assistant — one parallel batch.
      if (massQueueAvailable) {
        const [haSettled, itemsSettled, maSettled] = await Promise.allSettled([
          callServiceWithResponse('music_assistant', 'get_queue', { entity_id: entityId }),
          callServiceWithResponse('mass_queue', 'get_queue_items', {
            ...massQueueEntityData(entityId),
            limit: itemLimit + 2,
            limit_before: 1,
            limit_after: itemLimit,
          }),
          // HA get_queue often omits dont_stop_the_music / autoplay — pull flags from MA.
          massApiConfigured && attrQueueId ? fetchMaQueue(attrQueueId) : Promise.resolve(null),
        ])

        if (itemsSettled.status === 'fulfilled') {
          const haQueue =
            haSettled.status === 'fulfilled' ? parseQueueResponse(haSettled.value, entityId) : null
          const maQueue =
            maSettled.status === 'fulfilled' && maSettled.value
              ? normalizeQueue(maSettled.value)
              : null
          const queue = maQueue ?? haQueue
          const items = parseMassQueueItemsResponse(itemsSettled.value, entityId)
          return {
            queueId: queue?.queue_id ?? attrQueueId,
            queue,
            items: items.length > 0 ? items : queueItemsFromHaSummary(queue),
            haQueueAvailable: Boolean(queue) || items.length > 0,
            viaMassQueue: true,
          }
        }
        // Fall through to MA API / HA summary.
      }

      let haQueue: MusicQueue | null = null
      try {
        const haResponse = await callServiceWithResponse('music_assistant', 'get_queue', {
          entity_id: entityId,
        })
        haQueue = parseQueueResponse(haResponse, entityId)
      } catch {
        /* idle / no active queue via HA */
      }

      if (massApiConfigured) {
        const queueId =
          haQueue?.queue_id ?? attrQueueId ?? (await lookupPlayerId(connection, entityId))
        if (queueId) {
          try {
            // Start one before the current track so the up-next list is never empty.
            const offset = Math.max(0, (haQueue?.current_index ?? 0) - 1)
            const [queueRaw, items] = await Promise.all([
              fetchMaQueue(queueId),
              getQueueItems(queueId, itemLimit + 2, offset),
            ])
            const queue = queueRaw ? normalizeQueue(queueRaw) : haQueue
            return {
              queueId: queue?.queue_id ?? queueId,
              queue,
              items:
                Array.isArray(items) && items.length > 0 ? items : queueItemsFromHaSummary(queue),
              haQueueAvailable: Boolean(queue),
              viaMassQueue: false,
            }
          } catch {
            /* fall through */
          }
        }
      }

      return {
        queueId: haQueue?.queue_id ?? attrQueueId,
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

  const loadMore = useCallback(() => raiseItemLimit(entityId), [entityId])

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
      // Snapshot every page-size variant of the key so rollback is exact.
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
      loading: !query.data && (query.isLoading || massQueueAvailable === null),
      fetching: query.isFetching,
      ensuring,
      error:
        query.error instanceof Error
          ? query.error
          : query.error
            ? new Error(String(query.error))
            : null,
      itemLimit,
      loadMore,
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
      itemLimit,
      loadMore,
      massApiConfigured,
      massQueueAvailable,
      massUrl,
      player,
      queue,
      query.data,
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
