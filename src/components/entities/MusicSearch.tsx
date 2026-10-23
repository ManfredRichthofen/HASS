import { useServiceCall } from 'hass-react'
import { Disc3, ListPlus, ListStart, Loader2, Music2, Play, Search } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { notify } from '#/components/ui/toast'
import { cn } from '#/lib/cn'
import {
  type EnqueueMode,
  enqueueModes,
  type MediaSearchItem,
  mediaClassFilters,
  mediaClassLabel,
  parseSearchResults,
} from '#/lib/musicAssistant'

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
  return item.thumbnail && !failed ? (
    <img
      src={item.thumbnail}
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
        <p className="truncate text-xs text-ink-muted">{mediaClassLabel(item.media_class)}</p>
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
        {mediaClassLabel(item.media_class)}
      </p>
    </button>
  )
}

export function MusicSearch({ target, onQueued }: { target: string; onQueued?: () => void }) {
  const { callService, callServiceWithResponse } = useServiceCall()
  const [query, setQuery] = useState('')
  const [enqueue, setEnqueue] = useState<EnqueueMode>('play')
  const [filter, setFilter] = useState<string>('all')
  const [results, setResults] = useState<MediaSearchItem[]>([])
  const [searching, setSearching] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const searchRequestId = useRef(0)

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

  async function runSearch(event?: React.FormEvent) {
    event?.preventDefault()
    const q = query.trim()
    if (!q) return

    const requestId = ++searchRequestId.current
    setSearching(true)
    setSearched(true)
    try {
      const response = await callServiceWithResponse('media_player', 'search_media', {
        entity_id: target,
        search_query: q,
      })
      if (requestId !== searchRequestId.current) return
      setResults(parseSearchResults(response, target))
    } catch (e) {
      if (requestId !== searchRequestId.current) return
      setResults([])
      notify('Search failed', e instanceof Error ? e.message : 'Could not search')
    } finally {
      if (requestId === searchRequestId.current) setSearching(false)
    }
  }

  async function playItem(item: MediaSearchItem, mode: EnqueueMode = enqueue) {
    if (!item.can_play && !item.media_content_id) return
    setPlayingId(item.media_content_id)
    try {
      await callService('music_assistant', 'play_media', {
        entity_id: target,
        media_id: item.media_content_id,
        media_type: item.media_content_type || item.media_class || 'track',
        enqueue: mode,
      })
      const label = mode === 'add' ? 'Queued' : mode === 'next' ? 'Playing next' : 'Playing'
      notify(label, item.title)
      onQueued?.()
    } catch (e) {
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
    <div className="space-y-4 rounded-card border-ui border-border-subtle bg-surface shadow-card modern:border-transparent p-4 sm:p-5">
      <h3 className="text-display text-lg text-ink">Add music</h3>

      <form onSubmit={(e) => void runSearch(e)} className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint" />
          <Input
            value={query}
            onValueChange={(value) => setQuery(value)}
            placeholder="Song, artist, album, playlist…"
            className="pl-10"
            enterKeyHint="search"
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="accent" disabled={searching || !query.trim()}>
          {searching ? <Loader2 className="size-4 animate-spin" /> : 'Search'}
        </Button>
      </form>

      <div className="space-y-1.5">
        <p className="text-label">Tapping a result will</p>
        <div className="grid grid-cols-3 gap-1 rounded-card bg-canvas p-1">
          {enqueueModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              title={mode.hint}
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
      </div>

      {results.length > 0 ? (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {mediaClassFilters.map((item) => (
            <button
              key={item.id}
              type="button"
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

      <div className="space-y-5">
        {searching ? <p className="py-8 text-center text-sm text-ink-muted">Searching…</p> : null}

        {!searching && searched && !hasResults ? (
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
