import type { QueryClient } from '@tanstack/react-query'
import { type EntityState, useStore } from 'hass-react'
import type { QueueData } from '#/hooks/useMusicQueue'
import { getMassBaseUrl } from '#/lib/massConfig'
import {
  type MusicQueue,
  type QueueItem,
  queueItemArtist,
  queueItemImage,
  queueItemTitle,
} from '#/lib/musicAssistant'

/**
 * Demo-mode music: play/pause, skipping, seeking and queue jumps play out locally so the
 * now-playing animations (artwork crossfade, waveform, progress, bar slide-in) can be tested.
 * Steps through the real queue when one is loaded, otherwise a built-in playlist.
 * Every entry point is only called when demo mode is on.
 */

type Attrs = Record<string, unknown>
type QueueCache = QueueData

let queryClient: QueryClient | null = null

export function registerDemoQueryClient(client: QueryClient) {
  queryClient = client
}

// ---------------------------------------------------------------------------
// Built-in playlist for when nothing is queued in the house
// ---------------------------------------------------------------------------

function cover(hueA: number, hueB: number, shape: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hueA} 70% 55%)"/><stop offset="1" stop-color="hsl(${hueB} 65% 28%)"/></linearGradient></defs><rect width="512" height="512" fill="url(#g)"/>${shape}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const ring =
  '<circle cx="256" cy="256" r="150" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="28"/>'
const sun = '<circle cx="256" cy="300" r="110" fill="#fff" fill-opacity=".3"/>'
const bars =
  '<g fill="#fff" fill-opacity=".3"><rect x="120" y="200" width="40" height="180" rx="20"/><rect x="200" y="140" width="40" height="240" rx="20"/><rect x="280" y="230" width="40" height="150" rx="20"/><rect x="360" y="170" width="40" height="210" rx="20"/></g>'
const wave = '<path d="M0 300 Q128 220 256 300 T512 300 V512 H0Z" fill="#fff" fill-opacity=".25"/>'
const diamond =
  '<rect x="176" y="176" width="160" height="160" fill="#fff" fill-opacity=".3" transform="rotate(45 256 256)"/>'
const dots =
  '<g fill="#fff" fill-opacity=".3"><circle cx="170" cy="200" r="40"/><circle cx="330" cy="230" r="60"/><circle cx="230" cy="340" r="50"/></g>'

const DEMO_TRACKS: QueueItem[] = [
  ['Low Tide', 'Harbor Lights', 200, 260, wave, 214],
  ['Paper Satellites', 'The Quiet Hours', 280, 320, ring, 187],
  ['Golden Static', 'Mira Vale', 30, 350, sun, 233],
  ['Night Bus', 'Concrete Garden', 330, 250, bars, 198],
  ['Glass Orchard', 'Fen & Ivory', 140, 190, diamond, 241],
  ['Slow Weather', 'Kite Season', 10, 40, dots, 176],
].map(([title, artist, a, b, shape, duration], index) => ({
  queue_item_id: `demo-${index}`,
  index,
  media_title: title as string,
  media_artist: artist as string,
  local_image_encoded: cover(a as number, b as number, shape as string),
  duration: duration as number,
}))

// ---------------------------------------------------------------------------
// Queue cache access
// ---------------------------------------------------------------------------

function readQueue(entityId: string): QueueCache | undefined {
  const entries =
    queryClient?.getQueriesData<QueueCache>({ queryKey: ['music-queue', entityId] }) ?? []
  let best: QueueCache | undefined
  for (const [, data] of entries) {
    if (data && (!best || data.items.length > best.items.length)) best = data
  }
  return best
}

function writeQueue(entityId: string, updater: (old: QueueCache) => QueueCache) {
  queryClient?.setQueriesData<QueueCache | undefined>(
    { queryKey: ['music-queue', entityId] },
    (old) => (old ? updater(old) : old),
  )
}

/** Per-player list when no queue is cached for it (the Music page was never opened). */
const fallbackLists = new Map<string, QueueItem[]>()

/** The list to step through: the real queue page if there is one, else the demo playlist. */
function playlist(entityId: string) {
  const cached = readQueue(entityId)
  if (cached && cached.items.length > 0) return cached.items
  return fallbackLists.get(entityId) ?? DEMO_TRACKS
}

function setPlaylist(entityId: string, items: QueueItem[]) {
  const before = playlist(entityId).length
  fallbackLists.set(entityId, items)
  writeQueue(entityId, (old) => ({
    ...old,
    items,
    queue: old.queue
      ? { ...old.queue, items: Math.max(items.length, old.queue.items + items.length - before) }
      : old.queue,
  }))
}

// ---------------------------------------------------------------------------
// Search results: the service call only carries an ID, so Search tells us what it is
// ---------------------------------------------------------------------------

const searchedMedia = new Map<
  string,
  { title: string; artist?: string | null; image?: string | null }
>()
let demoItemSeq = 0

/** Called by Search before it plays something, so the demo can show the right song. */
export function noteDemoMedia(
  mediaId: string,
  info: { title: string; artist?: string | null; image?: string | null },
) {
  searchedMedia.set(mediaId, info)
}

function searchedItem(mediaId: string): QueueItem | null {
  const info = searchedMedia.get(mediaId)
  if (!info) return null
  return {
    queue_item_id: `demo-search-${++demoItemSeq}`,
    media_title: info.title,
    media_artist: info.artist ?? null,
    media_image: info.image ?? null,
    // A believable length that differs per song, so progress bars visibly differ.
    duration: 150 + ((info.title.length * 37) % 120),
  }
}

function currentIndex(entityId: string, items: QueueItem[], attrs: Attrs) {
  const currentId = readQueue(entityId)?.queue?.current_item?.queue_item_id
  if (currentId) {
    const found = items.findIndex((item) => item.queue_item_id === currentId)
    if (found >= 0) return found
  }
  const title = attrs.media_title
  return title ? items.findIndex((item) => queueItemTitle(item) === title) : -1
}

// ---------------------------------------------------------------------------
// Player state
// ---------------------------------------------------------------------------

/** Where the track is now, extrapolating from the last update while playing. */
function livePosition(state: string, attrs: Attrs) {
  const position = Number(attrs.media_position ?? 0)
  if (state !== 'playing') return position
  const at = Date.parse(String(attrs.media_position_updated_at ?? ''))
  const elapsed = Number.isFinite(at) ? (Date.now() - at) / 1000 : 0
  const duration = Number(attrs.media_duration ?? Number.POSITIVE_INFINITY)
  return Math.min(position + elapsed, duration)
}

function loadTrack(entityId: string, items: QueueItem[], index: number, attrs: Attrs): Attrs {
  const item = items[index]
  const previous = currentIndex(entityId, items, attrs)

  writeQueue(entityId, (old) => {
    const base: MusicQueue = old.queue ?? {
      queue_id: 'demo',
      items: items.length,
      shuffle_enabled: false,
      repeat_mode: 'off',
      current_index: null,
      elapsed_time: 0,
      current_item: null,
      next_item: null,
    }
    const queueIndex =
      base.current_index != null && previous >= 0
        ? base.current_index + (index - previous)
        : (item.index ?? index)
    return {
      ...old,
      items: old.items.length > 0 ? old.items : items,
      queue: {
        ...base,
        items: Math.max(base.items, items.length),
        current_index: queueIndex,
        current_item: item,
        next_item: items[index + 1] ?? null,
        elapsed_time: 0,
        state: 'playing',
      },
    }
  })

  return {
    ...attrs,
    media_title: queueItemTitle(item),
    media_artist: queueItemArtist(item),
    media_album_name: null,
    media_content_type: 'music',
    // Local art first in `playerArtSources`, so clear it or the old cover sticks.
    entity_picture_local: null,
    entity_picture: queueItemImage(item, getMassBaseUrl(), 512),
    media_duration: item.duration ?? 200,
    media_position: 0,
    media_position_updated_at: new Date().toISOString(),
  }
}

function step(entityId: string, attrs: Attrs, delta: number) {
  const items = playlist(entityId)
  const at = currentIndex(entityId, items, attrs)
  const next = at < 0 ? 0 : (at + delta + items.length) % items.length
  return loadTrack(entityId, items, next, attrs)
}

const endTimers = new Map<string, number>()

/** Write a simulated state into the local entity store, as an HA state_changed would. */
export function writeEntity(entityId: string, state: string, attributes: Attrs) {
  const store = useStore.getState()
  const current = store.entities.get(entityId)
  if (!current) return false
  const now = new Date().toISOString()
  const updated: EntityState = {
    ...current,
    state,
    attributes: attributes as EntityState['attributes'],
    last_updated: now,
    last_changed: state !== current.state ? now : current.last_changed,
  }
  store.updateEntity(entityId, updated)
  return true
}

function commit(entityId: string, state: string, attributes: Attrs) {
  if (!writeEntity(entityId, state, attributes)) return

  // Auto-advance at the end of the track so the change animations run hands-free.
  window.clearTimeout(endTimers.get(entityId))
  endTimers.delete(entityId)
  const duration = Number(attributes.media_duration)
  if (state === 'playing' && Number.isFinite(duration) && duration > 0) {
    const remaining = Math.max(0, duration - livePosition(state, attributes))
    endTimers.set(
      entityId,
      window.setTimeout(() => {
        const latest = useStore.getState().entities.get(entityId)
        if (latest?.state !== 'playing') return
        commit(entityId, 'playing', step(entityId, latest.attributes as Attrs, 1))
      }, remaining * 1000),
    )
  }
}

/** Re-anchor the reported position at `position`, as of now. */
function atPosition(attrs: Attrs, position: number): Attrs {
  return { ...attrs, media_position: position, media_position_updated_at: new Date().toISOString() }
}

/** Pause, stop and resume anchor the position at where the track had got to. */
const anchored = (state: string, attrs: Attrs) => atPosition(attrs, livePosition(state, attrs))

/**
 * Simulate one music-related service call for one player. Returns false when the call is
 * not music related, so the caller can fall back to its generic handling.
 */
export function simulateMusic(domain: string, service: string, entityId: string, data: Attrs) {
  const entity = useStore.getState().entities.get(entityId)
  if (!entity || !entityId.startsWith('media_player.')) return false
  const state = entity.state
  const attrs = entity.attributes as Attrs
  const hasTrack = Boolean(attrs.media_title)
  const with_ = (extra: Attrs) => commit(entityId, state, { ...attrs, ...extra })
  const play = () =>
    commit(entityId, 'playing', hasTrack ? anchored(state, attrs) : step(entityId, attrs, 0))

  if (domain === 'mass_queue') {
    if (service === 'play_queue_item') {
      const items = playlist(entityId)
      const index = items.findIndex((item) => item.queue_item_id === data.queue_item_id)
      if (index >= 0) commit(entityId, 'playing', loadTrack(entityId, items, index, attrs))
    }
    // Reorders and removals are already applied to the cached queue optimistically.
    return true
  }

  if (domain === 'music_assistant' || (domain === 'media_player' && service === 'play_media')) {
    if (service === 'play_media') {
      const enqueue = String(data.enqueue ?? 'play')
      const startsNow = enqueue === 'play' || enqueue === 'replace'
      const item = searchedItem(String(data.media_id ?? data.media_content_id ?? ''))
      if (!item) {
        // Not from Search (e.g. Endless Mix): nothing to show beyond playing.
        if (startsNow) play()
        return true
      }
      const items = playlist(entityId)
      const at = currentIndex(entityId, items, attrs)
      // Same shapes as Music Assistant: replace clears, add appends, play/next go after current.
      const next =
        enqueue === 'replace'
          ? [item]
          : enqueue === 'add'
            ? [...items, item]
            : [...items.slice(0, at + 1), item, ...items.slice(at + 1)]
      setPlaylist(entityId, next)
      if (startsNow)
        commit(entityId, 'playing', loadTrack(entityId, next, next.indexOf(item), attrs))
    }
    return true
  }

  if (domain !== 'media_player') return false

  switch (service) {
    case 'media_play':
      play()
      return true
    case 'media_pause':
      commit(entityId, 'paused', anchored(state, attrs))
      return true
    case 'media_play_pause':
      if (state === 'playing') commit(entityId, 'paused', anchored(state, attrs))
      else play()
      return true
    case 'media_stop':
      commit(entityId, 'idle', anchored(state, attrs))
      return true
    case 'media_next_track':
      commit(entityId, 'playing', step(entityId, attrs, 1))
      return true
    case 'media_previous_track':
      // Like a real player: a few seconds in, "previous" restarts the track.
      if (livePosition(state, attrs) > 3) {
        commit(entityId, 'playing', atPosition(attrs, 0))
      } else {
        commit(entityId, 'playing', step(entityId, attrs, -1))
      }
      return true
    case 'media_seek':
      commit(entityId, state, atPosition(attrs, Number(data.seek_position ?? 0)))
      return true
    case 'turn_on':
      commit(entityId, hasTrack ? 'paused' : 'idle', attrs)
      return true
    case 'turn_off':
      commit(entityId, 'off', anchored(state, attrs))
      return true
    case 'toggle':
      commit(entityId, state === 'off' ? 'idle' : 'off', attrs)
      return true
    case 'volume_set':
      with_({ volume_level: data.volume_level })
      return true
    case 'volume_up':
    case 'volume_down': {
      const delta = service === 'volume_up' ? 0.05 : -0.05
      with_({ volume_level: Math.min(1, Math.max(0, Number(attrs.volume_level ?? 0) + delta)) })
      return true
    }
    case 'volume_mute':
      with_({ is_volume_muted: data.is_volume_muted })
      return true
    case 'select_source':
      with_({ source: data.source })
      return true
    case 'shuffle_set':
      with_({ shuffle: data.shuffle })
      return true
    case 'repeat_set':
      with_({ repeat: data.repeat })
      return true
    case 'clear_playlist':
      commit(entityId, 'idle', {
        ...attrs,
        media_title: null,
        media_artist: null,
        entity_picture: null,
        entity_picture_local: null,
      })
      return true
    case 'join': {
      const members = ([] as string[]).concat((data.group_members as string[]) ?? [])
      const current = (attrs.group_members as string[] | undefined) ?? [entityId]
      with_({ group_members: [...new Set([...current, ...members])] })
      for (const member of members) {
        const m = useStore.getState().entities.get(member)
        if (m)
          commit(member, state, {
            ...(m.attributes as Attrs),
            ...attrs,
            group_members: [entityId, member],
          })
      }
      return true
    }
    case 'unjoin':
      with_({ group_members: [] })
      return true
    default:
      return true
  }
}

/** Music Assistant's own API (`player_queues/*`), for setups not using mass_queue in HA. */
export function simulateMassCommand(command: string, args: Attrs = {}) {
  const queueId = args.queue_id
  if (command !== 'player_queues/play_index' || typeof queueId !== 'string') return
  const entities = useStore.getState().entities
  for (const [id, entity] of entities) {
    if (!id.startsWith('media_player.') || entity.attributes.active_queue !== queueId) continue
    const items = playlist(id)
    const index =
      typeof args.index === 'string'
        ? items.findIndex((item) => item.queue_item_id === args.index)
        : items.findIndex((item) => item.index === args.index)
    if (index >= 0) commit(id, 'playing', loadTrack(id, items, index, entity.attributes as Attrs))
    return
  }
}
