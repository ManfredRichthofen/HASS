import { useMemo, useState } from 'react'
import { useServiceCall } from 'hass-react'
import { Loader2, Play, Search } from 'lucide-react'
import {
  mediaClassFilters,
  mediaClassLabel,
  mediaTargets,
  parseSearchResults,
  type MediaSearchItem,
} from '#/lib/musicAssistant'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { notify } from '#/components/ui/toast'
import { cn } from '#/lib/cn'

export function MusicSearch() {
  const { callService, callServiceWithResponse } = useServiceCall()
  const [query, setQuery] = useState('')
  const [target, setTarget] = useState<string>(mediaTargets[0].id)
  const [filter, setFilter] = useState<string>('all')
  const [results, setResults] = useState<MediaSearchItem[]>([])
  const [searching, setSearching] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const filtered = useMemo(() => {
    if (filter === 'all') return results
    return results.filter((item) => item.media_class === filter)
  }, [filter, results])

  async function runSearch(event?: React.FormEvent) {
    event?.preventDefault()
    const q = query.trim()
    if (!q) return

    setSearching(true)
    setSearched(true)
    try {
      const response = await callServiceWithResponse(
        'media_player',
        'search_media',
        {
          entity_id: target,
          search_query: q,
        },
      )
      setResults(parseSearchResults(response, target))
    } catch (e) {
      setResults([])
      notify(
        'Search failed',
        e instanceof Error ? e.message : 'Music Assistant error',
      )
    } finally {
      setSearching(false)
    }
  }

  async function playItem(item: MediaSearchItem) {
    if (!item.can_play && !item.media_content_id) return
    setPlayingId(item.media_content_id)
    try {
      await callService('media_player', 'play_media', {
        entity_id: target,
        media_content_id: item.media_content_id,
        media_content_type: item.media_content_type || 'music',
      })
      notify('Playing', item.title)
    } catch (e) {
      notify(
        'Play failed',
        e instanceof Error ? e.message : 'Could not start playback',
      )
    } finally {
      setPlayingId(null)
    }
  }

  return (
    <div className="space-y-4 rounded-[1.75rem] border border-border-subtle bg-surface p-4">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">
          Music Assistant
        </p>
        <h3 className="mt-1 font-display text-lg font-semibold text-ink">
          Search & play
        </h3>
      </div>

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
        <Button
          type="submit"
          variant="accent"
          disabled={searching || !query.trim()}
          className="shrink-0"
        >
          {searching ? <Loader2 className="size-4 animate-spin" /> : 'Search'}
        </Button>
      </form>

      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {mediaTargets.map((player) => (
          <button
            key={player.id}
            type="button"
            onClick={() => setTarget(player.id)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition',
              target === player.id
                ? 'border-accent/40 bg-accent-soft text-accent'
                : 'border-border-subtle bg-canvas text-ink-muted hover:text-ink',
            )}
          >
            {player.label}
          </button>
        ))}
      </div>

      {results.length > 0 ? (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {mediaClassFilters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                'shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-medium capitalize transition',
                filter === item.id
                  ? 'bg-canvas-elevated text-accent'
                  : 'text-ink-muted hover:text-ink',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="max-h-[28rem] space-y-2 overflow-y-auto overscroll-contain">
        {searching ? (
          <p className="py-8 text-center text-sm text-ink-muted">Searching…</p>
        ) : null}

        {!searching && searched && filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">
            No matches. Try another query or player.
          </p>
        ) : null}

        {!searching &&
          filtered.map((item) => (
            <div
              key={`${item.media_content_id}-${item.title}`}
              className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-canvas/60 p-2.5"
            >
              <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-border">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-[10px] text-ink-faint uppercase">
                    {item.media_class.slice(0, 3)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {item.title}
                </p>
                <p className="truncate text-xs capitalize text-ink-muted">
                  {mediaClassLabel(item.media_class)}
                </p>
              </div>
              <Button
                size="icon"
                variant="accent"
                disabled={playingId === item.media_content_id}
                aria-label={`Play ${item.title}`}
                onClick={() => void playItem(item)}
              >
                {playingId === item.media_content_id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4 fill-current" />
                )}
              </Button>
            </div>
          ))}
      </div>
    </div>
  )
}
