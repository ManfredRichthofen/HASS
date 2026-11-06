import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useServiceCall } from 'hass-react'
import {
  Disc3,
  History,
  ListPlus,
  ListStart,
  Loader2,
  Music2,
  Play,
  Radio,
  Search,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Toggle } from '#/components/ui/toggle'
import { notify } from '#/components/ui/toast'
import { entities } from '#/config/dashboard'
import { haUrl } from '#/config/ha'
import { cn } from '#/lib/cn'
import { getMassBaseUrl } from '#/lib/massConfig'
import {
  type EnqueueMode,
  enqueueModes,
  type MediaSearchItem,
  mediaClassFilters,
  mediaClassLabel,
  parseMassSearchResults,
  parseSearchResults,
  resolveMediaThumbnail,
} from '#/lib/musicAssistant'

// Each search waits on every provider (Spotify is the slow one) and can't be cancelled,
// so wait for a real pause in typing. Enter searches immediately.
const SEARCH_DEBOUNCE_MS = 650
const MIN_TYPED_LENGTH = 3
const RECENT_KEY = 'music-recent-searches'
const RECENT_LIMIT = 8

// v2: earlier saved results still contain the per-provider duplicates.
const RESULTS_KEY = 'music-search-results-v2'
const RESULTS_KEPT = 6
const RESULTS_STALE_MS = 5 * 60_000

/**
 * A search waits on every connected provider, and Home Assistant cannot cancel it. Give up
 * waiting (not searching) after this long so the page never sits on a skeleton forever.
 */
const SEARCH_TIMEOUT_MS = 20_000

class SearchTimeoutError extends Error {
  constructor() {
    super('Search is taking longer than usual. A music service may be slow.')
    this.name = 'SearchTimeoutError'
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(() => reject(new SearchTimeoutError()), ms)
    promise.then(
      (value) => {
        window.clearTimeout(id)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(id)
        reject(error)
      },
    )
  })
}

type StoredResults = Record<string, { at: number; items: MediaSearchItem[] }>

const resultsKey = (target: string, query: string) => `${target}|${query.toLowerCase()}`

const readStoredResults = (): StoredResults => {
  if (typeof localStorage === 'undefined') return {}
  try {
    const parsed = JSON.parse(localStorage.getItem(RESULTS_KEY) ?? '{}') as unknown
    return parsed && typeof parsed === 'object' ? (parsed as StoredResults) : {}
  } catch {
    return {}
  }
}

/** Keep the last few searches' results so a repeat search paints instantly, even after a restart. */
const writeStoredResults = (key: string, items: MediaSearchItem[]) => {
  if (typeof localStorage === 'undefined') return
  try {
    const next = { ...readStoredResults(), [key]: { at: Date.now(), items } }
    const kept = Object.entries(next)
      .sort((a, b) => b[1].at - a[1].at)
      .slice(0, RESULTS_KEPT)
    localStorage.setItem(RESULTS_KEY, JSON.stringify(Object.fromEntries(kept)))
  } catch {
    /* storage full or unavailable */
  }
}

/** Last query, so reopening the Search sheet shows the same (cached) results. */
let lastQuery = ''

const readRecentSearches = (): string[] => {
  if (typeof localStorage === 'undefined') return []
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

const writeRecentSearches = (recent: string[]) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent))
}

const itemSubtitle = (item: MediaSearchItem) => item.subtitle || mediaClassLabel(item.media_class)

const GROUP_ORDER = ['track', 'album', 'artist', 'playlist', 'radio'] as const
const GROUP_TITLES: Record<string, string> = {
  track: 'Tracks',
  album: 'Albums',
  artist: 'Artists',
  playlist: 'Playlists',
  radio: 'Radio',
  other: 'More',
}

function ModeIcon({ mode, className }: { mode: EnqueueMode; className?: string }) {
  if (mode === 'add') return <ListPlus className={className} />
  if (mode === 'next') return <ListStart className={className} />
  return <Play className={cn(className, 'fill-current')} />
}

function Thumb({ item, round }: { item: MediaSearchItem; round?: boolean }) {
  const [failed, setFailed] = useState(false)
  const src = resolveMediaThumbnail(item.thumbnail, haUrl, getMassBaseUrl())
  return src && !failed ? (
    <img
      src={src}
      alt=""
      className="size-full object-cover"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  ) : (
    <div
      className={cn(
        'grid size-full place-items-center bg-border text-ink-faint',
        round && 'rounded-pill',
      )}
    >
      {item.media_class === 'track' ? <Music2 className="size-5" /> : <Disc3 className="size-6" />}
    </div>
  )
}

function TrackRow({
  item,
  busy,
  mode,
  onPlay,
}: {
  item: MediaSearchItem
  busy: boolean
  mode: EnqueueMode
  onPlay: () => void
}) {
  const hint = enqueueModes.find((m) => m.id === mode)?.hint ?? 'Play'
  return (
    <div className="flex items-center gap-3 rounded-card border-ui border-border-subtle bg-surface shadow-card modern:border-transparent p-2">
      <div className="size-12 shrink-0 overflow-hidden rounded-control">
        <Thumb item={item} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
        <p className="truncate text-xs text-ink-muted">{itemSubtitle(item)}</p>
      </div>
      <Button
        size="icon"
        variant="accent"
        className="shrink-0"
        disabled={busy}
        aria-label={`${hint} ${item.title}`}
        onClick={onPlay}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ModeIcon mode={mode} className="size-4" />
        )}
      </Button>
    </div>
  )
}

function SearchResultsSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Searching">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-card border-ui border-border-subtle bg-surface p-2 shadow-card modern:border-transparent"
        >
          <div className="size-12 shrink-0 animate-pulse rounded-control bg-surface-hover" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded-control bg-surface-hover" />
            <div className="h-3 w-1/3 animate-pulse rounded-control bg-surface-hover" />
          </div>
          <div className="size-10 shrink-0 animate-pulse rounded-pill bg-surface-hover" />
        </div>
      ))}
    </div>
  )
}

function MediaCard({
  item,
  busy,
  mode,
  onPlay,
}: {
  item: MediaSearchItem
  busy: boolean
  mode: EnqueueMode
  onPlay: () => void
}) {
  const hint = enqueueModes.find((m) => m.id === mode)?.hint ?? 'Play'
  const round = item.media_class === 'artist'
  return (
    <button
      type="button"
      disabled={busy}
      aria-label={`${hint} ${item.title}`}
      onClick={onPlay}
      className="group min-w-0 rounded-card border-ui border-border-subtle bg-surface shadow-card modern:border-transparent p-2 text-left transition-ui hover:bg-surface-hover"
    >
      <div
        className={cn(
          'relative aspect-square w-full overflow-hidden',
          round ? 'rounded-pill' : 'rounded-control',
        )}
      >
        <Thumb item={item} round={round} />
        <span
          className={cn(
            'absolute right-1.5 bottom-1.5 grid size-8 place-items-center rounded-pill bg-accent text-on-accent shadow-md transition-ui',
            !busy && 'opacity-90 group-hover:opacity-100',
          )}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ModeIcon mode={mode} className="size-4" />
          )}
        </span>
      </div>
      <p className={cn('mt-2 truncate text-sm font-semibold text-ink', round && 'text-center')}>
        {item.title}
      </p>
      <p className={cn('truncate text-xs text-ink-muted', round && 'text-center')}>
        {itemSubtitle(item)}
      </p>
    </button>
  )
}

export function MusicSearch({ target, onQueued }: { target: string; onQueued?: () => void }) {
  const { callService, callServiceWithResponse } = useServiceCall()
  const [query, setQuery] = useState(lastQuery)
  const [activeQuery, setActiveQuery] = useState(lastQuery)
  const [enqueue, setEnqueue] = useState<EnqueueMode>('play')
  const [radio, setRadio] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>(readRecentSearches)

  // Search as you type, after a short pause.
  useEffect(() => {
    const q = query.trim()
    lastQuery = q
    if (q.length < MIN_TYPED_LENGTH) {
      if (!q) setActiveQuery('')
      return
    }
    const id = window.setTimeout(() => setActiveQuery(q), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [query])

  const searchQuery = useQuery({
    queryKey: ['music-search', target, activeQuery],
    enabled: activeQuery.length > 0,
    staleTime: RESULTS_STALE_MS,
    gcTime: 10 * 60_000,
    retry: false,
    // A saved copy shows at once; once older than staleTime it refreshes in the background.
    initialData: () => readStoredResults()[resultsKey(target, activeQuery)]?.items,
    initialDataUpdatedAt: () => readStoredResults()[resultsKey(target, activeQuery)]?.at,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<MediaSearchItem[]> => {
      // Music Assistant's own search returns artists and albums for each result.
      if (entities.musicAssistantEntryId) {
        try {
          const response = await withTimeout(
            callServiceWithResponse('music_assistant', 'search', {
              config_entry_id: entities.musicAssistantEntryId,
              name: activeQuery,
              // Only ask for what the page shows. Audiobooks and podcasts were searched on
              // every provider and thrown away, which roughly doubled the response.
              media_type: ['track', 'album', 'artist', 'playlist', 'radio'],
              limit: 12,
            }),
            SEARCH_TIMEOUT_MS,
          )
          // A successful answer is final, even when empty. Only a failure falls back.
          return parseMassSearchResults(response)
        } catch (error) {
          // A slow search is not a broken one: a fallback would just wait a second time.
          if (error instanceof SearchTimeoutError) throw error
          /* Music Assistant search failed: fall back to the media player search */
        }
      }
      const response = await withTimeout(
        callServiceWithResponse('media_player', 'search_media', {
          entity_id: target,
          search_query: activeQuery,
        }),
        SEARCH_TIMEOUT_MS,
      )
      return parseSearchResults(response, target)
    },
  })

  const searched = activeQuery.length > 0
  const results = useMemo(
    () => (searched && !searchQuery.isError ? (searchQuery.data ?? []) : []),
    [searched, searchQuery.data, searchQuery.isError],
  )
  const searching = searched && searchQuery.isLoading
  const refreshing = searched && searchQuery.isFetching
  // The previous query's results stay up while a new one loads. Say so, and don't let a tap
  // play something that no longer matches what was typed.
  const stale = searched && searchQuery.isPlaceholderData
  const shownQuery = useRef('')
  useEffect(() => {
    if (activeQuery && !searchQuery.isPlaceholderData && searchQuery.data) {
      shownQuery.current = activeQuery
    }
  }, [activeQuery, searchQuery.data, searchQuery.isPlaceholderData])

  // Remember queries that found something.
  useEffect(() => {
    if (!activeQuery || searchQuery.isPlaceholderData || !searchQuery.data?.length) return
    writeStoredResults(resultsKey(target, activeQuery), searchQuery.data)
    setRecentSearches((prev) => {
      const next = [
        activeQuery,
        ...prev.filter((q) => q.toLowerCase() !== activeQuery.toLowerCase()),
      ].slice(0, RECENT_LIMIT)
      writeRecentSearches(next)
      return next
    })
  }, [activeQuery, searchQuery.data, searchQuery.isPlaceholderData, target])

  const groups = useMemo(() => {
    const visible = filter === 'all' ? results : results.filter((i) => i.media_class === filter)
    const byClass = new Map<string, MediaSearchItem[]>()
    for (const item of visible) {
      const key = (GROUP_ORDER as readonly string[]).includes(item.media_class)
        ? item.media_class
        : 'other'
      byClass.set(key, [...(byClass.get(key) ?? []), item])
    }
    return [...GROUP_ORDER, 'other' as const]
      .filter((key) => byClass.has(key))
      .map((key) => ({ key, title: GROUP_TITLES[key]!, items: byClass.get(key)! }))
  }, [filter, results])

  const hasResults = groups.length > 0

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const q = query.trim()
    if (!q) return
    if (q === activeQuery) {
      void searchQuery.refetch()
      return
    }
    setActiveQuery(q)
  }

  const handleClear = () => {
    setQuery('')
    setActiveQuery('')
    setFilter('all')
  }

  const handleRecent = (recent: string) => {
    setQuery(recent)
    setActiveQuery(recent)
  }

  const handleClearRecent = () => {
    setRecentSearches([])
    writeRecentSearches([])
  }

  async function playItem(item: MediaSearchItem, mode: EnqueueMode = enqueue) {
    if (stale) return
    if (!item.can_play && !item.media_content_id) return
    setPlayingId(item.media_content_id)
    try {
      await callService('music_assistant', 'play_media', {
        entity_id: target,
        media_id: item.media_content_id,
        media_type: item.media_content_type || item.media_class || 'track',
        enqueue: mode,
        ...(radio ? { radio_mode: true } : {}),
      })
      const label = radio
        ? 'Playing song radio'
        : mode === 'add'
          ? 'Queued'
          : mode === 'next'
            ? 'Playing next'
            : 'Playing'
      notify(label, item.title)
      onQueued?.()
    } catch (e) {
      if (radio) {
        notify(
          'Song radio failed',
          e instanceof Error ? e.message : 'Provider may not support similar tracks',
        )
        return
      }
      try {
        await callService('media_player', 'play_media', {
          entity_id: target,
          media_content_id: item.media_content_id,
          media_content_type: item.media_content_type || 'music',
          enqueue: mode === 'play' ? 'play' : mode === 'next' ? 'next' : 'add',
        })
        notify(mode === 'add' ? 'Queued' : 'Playing', item.title)
        onQueued?.()
      } catch (fallbackError) {
        notify(
          'Play failed',
          fallbackError instanceof Error
            ? fallbackError.message
            : e instanceof Error
              ? e.message
              : 'Could not start playback',
        )
      }
    } finally {
      setPlayingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="sr-only">Add music</h3>

      <form onSubmit={handleSubmit} className="flex gap-2" role="search">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint" />
          <Input
            type="search"
            value={query}
            onValueChange={(value) => setQuery(value)}
            placeholder="Song, artist, album, playlist…"
            aria-label="Search music"
            className="pr-11 pl-10 [&::-webkit-search-cancel-button]:hidden"
            enterKeyHint="search"
            autoComplete="off"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={handleClear}
              className="absolute top-1/2 right-0.5 grid size-11 -translate-y-1/2 place-items-center rounded-pill text-ink-faint transition-ui hover:bg-surface-hover hover:text-ink"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <Button type="submit" variant="accent" disabled={!query.trim()}>
          {refreshing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Search
        </Button>
      </form>

      {!query && recentSearches.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-label">Recent</p>
            <button
              type="button"
              onClick={handleClearRecent}
              className="text-xs font-medium text-ink-muted transition-ui hover:text-ink"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recentSearches.map((recent) => (
              <button
                key={recent}
                type="button"
                onClick={() => handleRecent(recent)}
                className="touch-target flex max-w-full items-center gap-1.5 rounded-pill border border-border-subtle px-3.5 text-xs font-medium text-ink-muted transition-ui hover:text-ink"
              >
                <History className="size-3.5 shrink-0" />
                <span className="truncate">{recent}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-label">Tapping a result will</p>
        <div role="group" aria-label="Tapping a result will" className="grid grid-cols-3 gap-1 rounded-card bg-canvas p-1">
          {enqueueModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              title={mode.hint}
              aria-pressed={enqueue === mode.id}
              onClick={() => setEnqueue(mode.id)}
              className={cn(
                'touch-target flex items-center justify-center gap-1.5 rounded-control px-2 text-xs font-medium transition-ui',
                enqueue === mode.id ? 'bg-accent text-on-accent' : 'text-ink-muted hover:text-ink',
              )}
            >
              <ModeIcon mode={mode.id} className="size-3.5" />
              {mode.hint}
            </button>
          ))}
        </div>
        <Toggle
          pressed={radio}
          onPressedChange={setRadio}
          aria-label="Song radio: after the song you pick, keep playing similar songs"
          className="w-full gap-2"
        >
          <Radio className="size-4" />
          Song radio
        </Toggle>
      </div>

      {results.length > 0 ? (
        <div
          role="group"
          aria-label="Filter results"
          className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {mediaClassFilters.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={cn(
                'touch-target shrink-0 rounded-pill border px-3.5 text-xs font-medium transition-ui',
                filter === item.id
                  ? 'border-accent bg-accent text-on-accent'
                  : 'border-border-subtle text-ink-muted hover:text-ink',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {searching
          ? 'Searching'
          : searched && !searchQuery.isError
            ? `${results.length} ${results.length === 1 ? 'result' : 'results'}`
            : ''}
      </p>

      <div
        className={cn(
          'space-y-5 transition-opacity',
          refreshing && !searching && 'opacity-60',
          stale && 'pointer-events-none',
        )}
        aria-busy={stale || undefined}
      >
        {searching ? <SearchResultsSkeleton /> : null}

        {stale && !searching && shownQuery.current ? (
          <p className="text-xs text-ink-muted">
            Showing results for “{shownQuery.current}” while “{activeQuery}” loads
          </p>
        ) : null}

        {searched && searchQuery.isError && !searching ? (
          <div className="rounded-control border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {searchQuery.error instanceof Error ? searchQuery.error.message : 'Search failed'}{' '}
            <button type="button" className="underline" onClick={() => void searchQuery.refetch()}>
              Retry
            </button>
          </div>
        ) : null}

        {!searching && searched && !searchQuery.isError && !hasResults ? (
          <p className="py-8 text-center text-sm text-ink-muted">No matches. Try another query.</p>
        ) : null}

        {!searching && !searched ? (
          <p className="py-6 text-center text-sm text-ink-muted">
            Find something to play, play next, or add to the queue.
          </p>
        ) : null}

        {!searching
          ? groups.map((group) => (
              <section key={group.key} className="space-y-2">
                <h4 className="text-label">{group.title}</h4>
                {group.key === 'track' ? (
                  <div className="space-y-2">
                    {group.items.map((item, i) => (
                      <TrackRow
                        key={`${item.media_content_id}-${i}`}
                        item={item}
                        mode={enqueue}
                        busy={playingId === item.media_content_id}
                        onPlay={() => void playItem(item)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {group.items.map((item, i) => (
                      <MediaCard
                        key={`${item.media_content_id}-${i}`}
                        item={item}
                        mode={enqueue}
                        busy={playingId === item.media_content_id}
                        onPlay={() => void playItem(item)}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))
          : null}
      </div>
    </div>
  )
}
