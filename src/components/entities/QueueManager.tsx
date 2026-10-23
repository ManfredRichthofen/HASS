import { useServiceCall } from 'hass-react'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ListEnd,
  ListMusic,
  ListStart,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '#/components/ui/button'
import { notify } from '#/components/ui/toast'
import { haUrl } from '#/config/ha'
import { useMusicQueue } from '#/hooks/useMusicQueue'
import { cn } from '#/lib/cn'
import {
  formatDuration,
  mediaTargets,
  nextRepeatMode,
  type QueueItem,
  queueItemArtist,
  queueItemImage,
  queueItemTitle,
  repeatModeLabel,
  resolveHaMediaUrl,
} from '#/lib/musicAssistant'

function Artwork({
  src,
  label,
  size = 'md',
}: {
  src: string | null | undefined
  label: string
  size?: 'md' | 'hero'
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = Boolean(src) && src !== failedSrc

  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden bg-surface-hover',
        size === 'hero' &&
          'aspect-square w-full rounded-card bg-on shadow-on brutal:border-2 brutal:border-ink brutal:shadow-[6px_6px_0_var(--c-ink)] glass:rounded-pill glass:ring-[6px] glass:ring-white/70',
        size === 'md' && 'size-12 rounded-control',
      )}
    >
      {showImage && src ? (
        <img
          key={src}
          src={src}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div
          className={cn(
            'grid size-full place-items-center',
            size === 'hero' ? 'text-on-ink/70' : 'text-ink-faint',
          )}
        >
          <ListMusic className={size === 'md' ? 'size-4' : 'size-14'} />
        </div>
      )}
      <span className="sr-only">{label}</span>
    </div>
  )
}

function useLivePosition(position: number | null, duration: number | null, playing: boolean) {
  const [now, setNow] = useState(() => Date.now())
  const [base, setBase] = useState({ position: position ?? 0, at: Date.now() })

  useEffect(() => {
    setBase({ position: position ?? 0, at: Date.now() })
  }, [position])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(id)
  }, [playing])

  const live = playing ? base.position + (now - base.at) / 1000 : (position ?? 0)
  const clamped = duration != null ? Math.min(Math.max(live, 0), duration) : Math.max(live, 0)
  const pct = duration && duration > 0 ? Math.min(100, (clamped / duration) * 100) : 0
  return { position: clamped, pct }
}

function ActionChip({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-10 items-center gap-1.5 rounded-pill border-ui border-border px-3.5 text-xs font-semibold transition-ui hover:bg-surface-hover brutal:font-label brutal:uppercase',
        danger ? 'text-danger' : 'text-ink',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function PlayerSkeleton({
  view,
  artClassName,
}: {
  view: 'all' | 'player' | 'queue'
  artClassName?: string
}) {
  return (
    <section className="grid gap-4" aria-busy="true" aria-label="Loading now playing">
      <div
        className={cn(
          'grid gap-4',
          view === 'player' &&
            'grid-cols-[5.5rem_minmax(0,1fr)] items-end @xl:grid-cols-1 @xl:items-stretch',
        )}
      >
        <div
          className={cn(
            'relative mx-auto w-full',
            view === 'player'
              ? cn(
                  '@max-xl:w-[5.5rem] @max-xl:[&_*]:rounded-control glass:@max-xl:[&_*]:rounded-pill',
                  artClassName,
                )
              : artClassName,
          )}
        >
          <div className="aspect-square w-full animate-pulse rounded-card bg-surface-hover glass:rounded-pill" />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-20 animate-pulse rounded-control bg-surface-hover" />
            <div
              className={cn(
                'h-7 w-3/4 max-w-xs animate-pulse rounded-control bg-surface-hover',
                view === 'player' ? '@max-xl:h-6 @xl:h-8' : 'h-8',
              )}
            />
            <div className="h-4 w-1/2 max-w-[12rem] animate-pulse rounded-control bg-surface-hover" />
          </div>
          <div className="size-11 shrink-0 animate-pulse rounded-pill bg-surface-hover" />
        </div>
      </div>

      <div className="grid gap-2.5">
        <div className="h-1.5 animate-pulse rounded-pill bg-surface-hover brutal:h-2.5" />
        <div className="flex justify-between">
          <div className="h-3 w-8 animate-pulse rounded-control bg-surface-hover" />
          <div className="h-3 w-10 animate-pulse rounded-control bg-surface-hover" />
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="size-11 animate-pulse rounded-pill bg-surface-hover" />
        <div className="size-14 animate-pulse rounded-pill bg-surface-hover" />
        <div className="size-19 animate-pulse rounded-pill bg-surface-hover" />
        <div className="size-14 animate-pulse rounded-pill bg-surface-hover" />
        <div className="size-11 animate-pulse rounded-pill bg-surface-hover" />
      </div>
    </section>
  )
}

function QueueSkeleton() {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-label="Loading queue">
      <div className="flex items-end justify-between gap-2">
        <div className="space-y-1.5">
          <div className="h-4 w-20 animate-pulse rounded-control bg-surface-hover" />
          <div className="h-3 w-28 animate-pulse rounded-control bg-surface-hover" />
        </div>
        <div className="h-8 w-24 animate-pulse rounded-control bg-surface-hover" />
      </div>
      <div className="rounded-card border-ui border-border-subtle bg-surface pr-1.5 pl-3 shadow-card modern:border-transparent brutal:border-ink">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex min-h-16 items-center gap-2 border-b border-border-subtle py-2 last:border-b-0 brutal:border-b-2 brutal:border-ink brutal:last:border-b-0"
          >
            <div className="h-3 w-5 shrink-0 animate-pulse rounded-control bg-surface-hover" />
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="size-12 shrink-0 animate-pulse rounded-control bg-surface-hover" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded-control bg-surface-hover" />
                <div className="h-3 w-1/2 animate-pulse rounded-control bg-surface-hover" />
              </div>
            </div>
            <div className="hidden h-3 w-8 shrink-0 animate-pulse rounded-control bg-surface-hover sm:block" />
            <div className="size-9 shrink-0 animate-pulse rounded-pill bg-surface-hover" />
          </div>
        ))}
      </div>
    </div>
  )
}

function QueueRow({
  item,
  position,
  massUrl,
  busy,
  disabled,
  canManage,
  supportMoveToEnd,
  isFirstMovable,
  isLast,
  onPlay,
  onRemove,
  onMoveUp,
  onMoveDown,
  onPlayNext,
  onMoveEnd,
}: {
  item: QueueItem
  position: number
  massUrl: string | null
  busy: string | null
  disabled: boolean
  canManage: boolean
  supportMoveToEnd: boolean
  isFirstMovable: boolean
  isLast: boolean
  onPlay: () => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onPlayNext: () => void
  onMoveEnd: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const title = queueItemTitle(item) ?? 'Unknown track'
  const artist = queueItemArtist(item)
  const art = queueItemImage(item, massUrl, 160)
  const itemId = item.queue_item_id ?? String(position)
  const rowBusy = busy === itemId

  function act(fn: () => void) {
    setExpanded(false)
    fn()
  }

  return (
    <div
      className={cn(
        'border-b border-border-subtle transition-ui last:border-b-0 brutal:border-b-2 brutal:border-ink brutal:last:border-b-0',
        expanded && 'bg-surface-hover/50',
      )}
    >
      <div className="flex min-h-16 items-center gap-2 py-2">
        <span className="w-5 shrink-0 text-center text-[11px] font-medium tabular-nums text-ink-faint">
          {position}
        </span>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          disabled={disabled || rowBusy}
          aria-label={`Play ${title}`}
          onClick={onPlay}
        >
          <Artwork src={art} label="" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] font-semibold text-ink">{title}</p>
            <p className="truncate text-[0.8125rem] text-ink-muted brutal:font-label brutal:text-xs">
              {artist ?? 'Queued'}
            </p>
          </div>
        </button>

        {item.duration != null ? (
          <span className="hidden shrink-0 text-xs tabular-nums text-ink-faint sm:block">
            {formatDuration(item.duration)}
          </span>
        ) : null}

        {canManage ? (
          <Button
            size="icon"
            variant="ghost"
            className="size-9 shrink-0"
            disabled={disabled || rowBusy}
            aria-label="Queue item actions"
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
          >
            {rowBusy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <MoreHorizontal className="size-4" />
            )}
          </Button>
        ) : null}
      </div>

      {expanded ? (
        <div className="flex flex-wrap gap-1.5 border-t border-border-subtle px-2 py-2">
          <ActionChip
            icon={<Play className="size-3.5" />}
            label="Play now"
            onClick={() => act(onPlay)}
          />
          <ActionChip
            icon={<ListStart className="size-3.5" />}
            label="Play next"
            onClick={() => act(onPlayNext)}
          />
          {!isFirstMovable ? (
            <ActionChip
              icon={<ArrowUp className="size-3.5" />}
              label="Up"
              onClick={() => act(onMoveUp)}
            />
          ) : null}
          {!isLast ? (
            <ActionChip
              icon={<ArrowDown className="size-3.5" />}
              label="Down"
              onClick={() => act(onMoveDown)}
            />
          ) : null}
          {supportMoveToEnd && !isLast ? (
            <ActionChip
              icon={<ListEnd className="size-3.5" />}
              label="To end"
              onClick={() => act(onMoveEnd)}
            />
          ) : null}
          <ActionChip
            danger
            icon={<X className="size-3.5" />}
            label="Remove"
            onClick={() => act(onRemove)}
          />
        </div>
      ) : null}
    </div>
  )
}

/**
 * The music player and its queue. `view` lets the Music page place the player
 * and the up-next list in different panels; `artClassName` sizes the artwork
 * so the player fits the screen without scrolling.
 */
export function QueueManager({
  target,
  onTargetChange,
  view = 'all',
  artClassName = 'max-w-[22rem]',
}: {
  target: string
  onTargetChange: (id: string) => void
  view?: 'all' | 'player' | 'queue'
  artClassName?: string
}) {
  const showPlayer = view !== 'queue'
  const showQueue = view !== 'player'
  const { callService } = useServiceCall()
  const queueApi = useMusicQueue(target)
  const {
    queue,
    items,
    configured,
    viaMassQueue,
    massUrl,
    loading,
    fetching,
    ensuring,
    error,
    refresh,
    player,
  } = queueApi
  const [busy, setBusy] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  // Drop the confirm prompt if it's ignored or the room changes.
  useEffect(() => {
    if (!confirmClear) return
    const id = window.setTimeout(() => setConfirmClear(false), 4_000)
    return () => window.clearTimeout(id)
  }, [confirmClear])
  useEffect(() => setConfirmClear(false), [target])

  const currentTitle = queueItemTitle(queue?.current_item) ?? player.mediaTitle
  const currentArtist = queueItemArtist(queue?.current_item) ?? player.mediaArtist
  const attrs = player.attributes as { entity_picture?: unknown }
  const entityPicture =
    typeof attrs.entity_picture === 'string' ? resolveHaMediaUrl(attrs.entity_picture, haUrl) : null
  const currentArt = entityPicture ?? queueItemImage(queue?.current_item, massUrl, 256)
  const duration = player.mediaDuration ?? queue?.current_item?.duration ?? null
  const { position, pct } = useLivePosition(player.mediaPosition, duration, player.isPlaying)

  const shuffle = player.shuffle ?? queue?.shuffle_enabled ?? false
  const repeat = (player.repeat ?? queue?.repeat_mode ?? 'off').toLowerCase()
  const currentIndex = useMemo(() => {
    const currentId = queue?.current_item?.queue_item_id
    if (currentId) {
      const found = items.findIndex((item) => item.queue_item_id === currentId)
      if (found >= 0) return found
    }
    return queue?.current_index ?? null
  }, [items, queue?.current_index, queue?.current_item?.queue_item_id])

  const upNext = useMemo(() => {
    const mapped = items.map((item, index) => ({ item, index }))
    if (currentIndex == null) return mapped
    return mapped.filter(({ index }) => index > currentIndex)
  }, [currentIndex, items])

  const upNextDuration = useMemo(
    () => upNext.reduce((sum, { item }) => sum + (item.duration ?? 0), 0),
    [upNext],
  )

  const unavailable = player.isUnavailable
  const hasNowPlaying =
    Boolean(currentTitle) && (player.isPlaying || player.isPaused || items.length > 0)
  const canManageItems = configured
  const transferTargets = useMemo(
    () => mediaTargets.filter((playerTarget) => playerTarget.id !== target),
    [target],
  )

  async function run(key: string, action: () => Promise<void>, failLabel: string) {
    setBusy(key)
    try {
      await action()
    } catch (e) {
      notify(failLabel, e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(null)
    }
  }

  async function transferTo(destination: string) {
    setMenuOpen(false)
    await run(
      'transfer',
      async () => {
        await callService('music_assistant', 'transfer_queue', {
          entity_id: destination,
          source_player: target,
          auto_play: true,
        })
        onTargetChange(destination)
        await refresh()
      },
      'Transfer failed',
    )
  }

  return (
    <div className={cn(view === 'all' ? 'space-y-5' : 'grid gap-5')}>
      {error ? (
        <div className="rounded-control border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error.message}{' '}
          <button type="button" className="underline" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      ) : null}

      {loading && showPlayer && !hasNowPlaying ? (
        <PlayerSkeleton view={view} artClassName={artClassName} />
      ) : null}

      {loading && showQueue && upNext.length === 0 ? <QueueSkeleton /> : null}

      {!loading &&
      (view === 'queue'
        ? upNext.length === 0
        : !hasNowPlaying && (view === 'player' || upNext.length === 0)) ? (
        <div className="rounded-card border-ui border-dashed border-border-subtle px-4 py-10 text-center">
          <ListMusic className="mx-auto size-7 text-ink-faint" />
          <p className="mt-3 text-sm font-medium text-ink">
            {view === 'queue' ? 'Nothing queued' : 'Nothing playing'}
          </p>
          <p className="mt-1 text-xs text-ink-muted">Search to play or queue something.</p>
        </div>
      ) : null}

      {showPlayer && hasNowPlaying ? (
        <section className="grid gap-4" aria-label="Now playing">
          <div
            className={cn(
              'grid gap-4',
              view === 'player' &&
                'grid-cols-[5.5rem_minmax(0,1fr)] items-end @xl:grid-cols-1 @xl:items-stretch',
            )}
          >
            <div
              className={cn(
                'relative mx-auto w-full',
                view === 'player'
                  ? cn(
                      '@max-xl:w-[5.5rem] @max-xl:[&_*]:rounded-control glass:@max-xl:[&_*]:rounded-pill',
                      artClassName,
                    )
                  : artClassName,
              )}
            >
              <Artwork src={currentArt} label="Now playing artwork" size="hero" />
            </div>

            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-label">{player.isPlaying ? 'Now playing' : 'Paused'}</p>
                <p
                  className={cn(
                    'text-display mt-1.5 line-clamp-2 text-[1.75rem] leading-[1.1] text-ink',
                    view === 'player' && '@max-xl:text-xl',
                  )}
                >
                  {currentTitle ?? 'Unknown track'}
                </p>
                {currentArtist ? (
                  <p className="mt-1 truncate text-[0.9375rem] text-ink-muted">{currentArtist}</p>
                ) : null}
              </div>
              <div className="relative shrink-0">
                {(fetching && !loading) || ensuring ? (
                  <Loader2 className="m-3 size-5 animate-spin text-ink-faint" />
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={unavailable || busy !== null}
                    aria-label="Queue options"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                  >
                    <MoreHorizontal className="size-5" />
                  </Button>
                )}
                {menuOpen ? (
                  <div className="absolute right-0 bottom-full z-20 mb-1 min-w-[12rem] overflow-hidden rounded-control border-ui border-border bg-canvas-elevated shadow-sheet">
                    {transferTargets.map((dest) => (
                      <button
                        key={dest.id}
                        type="button"
                        className="block min-h-11 w-full px-4 py-2.5 text-left text-sm text-ink transition hover:bg-surface-hover"
                        onClick={() => void transferTo(dest.id)}
                      >
                        Move to {dest.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-2.5">
            <div
              className="relative h-1.5 rounded-pill bg-surface-hover brutal:h-2.5 brutal:border-2 brutal:border-ink brutal:bg-surface"
              role="progressbar"
              aria-label="Playback progress"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-pill bg-ink"
                style={{ width: `${pct}%` }}
              />
              <span
                className="absolute top-1/2 -mt-2 -ml-2 size-4 rounded-pill bg-ink brutal:-mt-[11px] brutal:-ml-[3px] brutal:h-[22px] brutal:w-1.5"
                style={{ left: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-ink-faint tabular-nums brutal:font-label brutal:text-ink">
              <span>{formatDuration(position)}</span>
              <span>
                {duration
                  ? `−${formatDuration(Math.max(0, duration - position))}`
                  : formatDuration(duration)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              className={cn(
                'grid size-11 place-items-center rounded-pill text-ink-muted transition-ui hover:text-ink',
                shuffle && 'bg-accent-soft text-ink brutal:bg-ink brutal:text-surface',
              )}
              disabled={unavailable || busy !== null}
              aria-label={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
              aria-pressed={shuffle}
              onClick={() =>
                void run('shuffle', () => queueApi.setShuffle(!shuffle), 'Shuffle failed')
              }
            >
              <Shuffle className="size-[18px]" />
            </button>
            <button
              type="button"
              className="grid size-14 place-items-center rounded-pill text-ink disabled:opacity-40"
              disabled={unavailable || busy !== null}
              aria-label="Previous"
              onClick={() => void run('prev', () => player.previousTrack(), 'Previous failed')}
            >
              <SkipBack className="size-6 fill-current" />
            </button>
            <button
              type="button"
              className="press grid size-19 place-items-center rounded-pill bg-accent text-on-accent disabled:opacity-40 brutal:border-2 brutal:border-ink brutal:shadow-press"
              disabled={unavailable || busy !== null}
              aria-label={player.isPlaying ? 'Pause' : 'Play'}
              onClick={() =>
                void run(
                  'toggle',
                  () => (player.isPlaying ? player.pause() : player.play()),
                  'Playback failed',
                )
              }
            >
              {busy === 'toggle' ? (
                <Loader2 className="size-7 animate-spin" />
              ) : player.isPlaying ? (
                <Pause className="size-7 fill-current" />
              ) : (
                <Play className="size-7 fill-current" />
              )}
            </button>
            <button
              type="button"
              className="grid size-14 place-items-center rounded-pill text-ink disabled:opacity-40"
              disabled={unavailable || busy !== null}
              aria-label="Next"
              onClick={() => void run('next', () => player.nextTrack(), 'Next failed')}
            >
              <SkipForward className="size-6 fill-current" />
            </button>
            <button
              type="button"
              className={cn(
                'grid size-11 place-items-center rounded-pill text-ink-muted transition-ui hover:text-ink',
                repeat !== 'off' && 'bg-accent-soft text-ink brutal:bg-ink brutal:text-surface',
              )}
              disabled={unavailable || busy !== null}
              aria-label={repeatModeLabel(repeat)}
              aria-pressed={repeat !== 'off'}
              onClick={() =>
                void run(
                  'repeat',
                  () => queueApi.setRepeat(nextRepeatMode(repeat)),
                  'Repeat failed',
                )
              }
            >
              {repeat === 'one' ? (
                <Repeat1 className="size-[18px]" />
              ) : (
                <Repeat className="size-[18px]" />
              )}
            </button>
          </div>
        </section>
      ) : null}

      {showQueue && upNext.length > 0 ? (
        <div className="space-y-2.5">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h3 className="text-ink walnut:font-serif walnut:text-xl walnut:italic modern:text-[0.8125rem] modern:font-semibold modern:text-ink-muted glass:text-base glass:font-semibold glass:text-ink brutal:font-label brutal:text-xs brutal:font-medium brutal:uppercase">
                Up next
              </h3>
              <p className="text-xs text-ink-muted">
                {upNext.length} {upNext.length === 1 ? 'track' : 'tracks'}
                {upNextDuration > 0 ? ` · ${formatDuration(upNextDuration)}` : ''}
                {queue?.is_dynamic || queue?.autoplay_enabled ? ' · Radio' : ''}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className={confirmClear ? 'text-danger' : 'text-ink-muted'}
              disabled={unavailable || busy !== null || !items.length}
              onClick={() => {
                if (!confirmClear) {
                  setConfirmClear(true)
                  return
                }
                setConfirmClear(false)
                void run('clear', () => queueApi.clear(), 'Clear failed')
              }}
            >
              {busy === 'clear' ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              {confirmClear ? 'Tap to clear all' : 'Clear queue'}
            </Button>
          </div>

          <div
            className={cn(
              view === 'all' && 'max-h-[30rem] overflow-y-auto overscroll-contain',
              'rounded-card border-ui border-border-subtle bg-surface pr-1.5 pl-3 shadow-card modern:border-transparent brutal:border-ink',
            )}
          >
            <div>
              {upNext.map((entry, rowIndex) => {
                const { item, index } = entry
                const itemId = item.queue_item_id ?? `idx-${index}`
                return (
                  <div key={item.queue_item_id ?? `q-${index}`}>
                    <QueueRow
                      item={item}
                      position={rowIndex + 1}
                      massUrl={massUrl}
                      busy={busy}
                      disabled={unavailable || busy !== null}
                      canManage={canManageItems}
                      supportMoveToEnd={!viaMassQueue}
                      isFirstMovable={
                        currentIndex == null ? index === 0 : index <= currentIndex + 1
                      }
                      isLast={index === items.length - 1}
                      onPlay={() =>
                        void run(
                          itemId,
                          () => queueApi.playIndex(item.queue_item_id ?? String(index)),
                          'Play failed',
                        )
                      }
                      onRemove={() =>
                        void run(itemId, () => queueApi.removeItem(itemId), 'Remove failed')
                      }
                      onMoveUp={() =>
                        void run(itemId, () => queueApi.moveUp(itemId), 'Move failed')
                      }
                      onMoveDown={() =>
                        void run(itemId, () => queueApi.moveDown(itemId), 'Move failed')
                      }
                      onPlayNext={() =>
                        void run(itemId, () => queueApi.playNext(itemId), 'Move failed')
                      }
                      onMoveEnd={() =>
                        void run(itemId, () => queueApi.moveToEnd(itemId), 'Move failed')
                      }
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
