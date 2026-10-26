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
  Radio,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MediaArt, uniqueArtCandidates } from '#/components/media/MediaArt'
import { Button } from '#/components/ui/button'
import { Slider } from '#/components/ui/slider'
import { Switch } from '#/components/ui/switch'
import { notify } from '#/components/ui/toast'
import { haUrl } from '#/config/ha'
import { useMusicQueue } from '#/hooks/useMusicQueue'
import { useOptimisticValue } from '#/hooks/useOptimisticValue'
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
  playerArtSources,
} from '#/lib/musicAssistant'

const ROW_PAGE = 50

type Player = ReturnType<typeof useMusicQueue>['player']

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

  const live = playing ? base.position + (now - base.at) / 1000 : base.position
  const clamped = duration != null ? Math.min(Math.max(live, 0), duration) : Math.max(live, 0)
  const pct = duration && duration > 0 ? Math.min(100, (clamped / duration) * 100) : 0
  const jumpTo = useCallback((seconds: number) => {
    setBase({ position: seconds, at: Date.now() })
    setNow(Date.now())
  }, [])
  return { position: clamped, pct, jumpTo }
}

/**
 * Progress and times. Owns the once-a-second tick so only this component
 * re-renders while a track plays. Seekable when the player supports it.
 */
function PlaybackProgress({
  player,
  duration,
  playing,
  disabled,
}: {
  player: Player
  duration: number | null
  playing: boolean
  disabled: boolean
}) {
  const { position, pct, jumpTo } = useLivePosition(player.mediaPosition, duration, playing)
  const [dragPosition, setDragPosition] = useState<number | null>(null)
  const canSeek = player.supportsSeek && duration != null && duration > 0
  const shown = dragPosition ?? position

  const handleSeekCommit = (value: number | readonly number[]) => {
    const seconds = Array.isArray(value) ? (value[0] ?? 0) : (value as number)
    setDragPosition(null)
    jumpTo(seconds)
    void player.seek(seconds).catch((e) => {
      notify('Seek failed', e instanceof Error ? e.message : 'Error')
    })
  }

  return (
    <div className="grid gap-2.5">
      {canSeek ? (
        <Slider
          size="thin"
          className="-my-4"
          aria-label="Seek"
          min={0}
          max={Math.floor(duration)}
          step={1}
          disabled={disabled}
          value={Math.floor(position)}
          onValueChange={(value) => setDragPosition(Array.isArray(value) ? value[0] : value)}
          onValueCommitted={handleSeekCommit}
        />
      ) : (
        <div
          className="relative h-1.5 rounded-pill bg-surface-hover"
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
            className="absolute top-1/2 -mt-2 -ml-2 size-4 rounded-pill bg-ink"
            style={{ left: `${pct}%` }}
          />
        </div>
      )}
      <div className="flex justify-between text-xs text-ink-faint tabular-nums">
        <span>{formatDuration(shown)}</span>
        <span>
          {duration ? `−${formatDuration(Math.max(0, duration - shown))}` : formatDuration(duration)}
        </span>
      </div>
    </div>
  )
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
        'flex min-h-10 items-center gap-1.5 rounded-pill border-ui border-border px-3.5 text-xs font-semibold transition-ui hover:bg-surface-hover',
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
  if (view === 'player') {
    return (
      <section
        className="flex min-h-0 flex-1 flex-col justify-center gap-4"
        aria-busy="true"
        aria-label="Loading now playing"
      >
        <div className="grid aspect-square min-h-0 w-full shrink place-items-center [container-type:size]">
          <div className="size-[calc(min(100cqw,100cqh)-12px)] animate-pulse rounded-card bg-surface-hover glass:rounded-pill" />
        </div>
        <div className="space-y-2">
          <div className="h-7 w-3/4 max-w-xs animate-pulse rounded-control bg-surface-hover" />
          <div className="h-4 w-1/2 max-w-[12rem] animate-pulse rounded-control bg-surface-hover" />
        </div>
        <div className="h-1.5 animate-pulse rounded-pill bg-surface-hover" />
        <div className="flex items-center justify-between px-1">
          <div className="size-11 animate-pulse rounded-pill bg-surface-hover" />
          <div className="size-14 animate-pulse rounded-pill bg-surface-hover" />
          <div className="size-[4.5rem] animate-pulse rounded-pill bg-surface-hover" />
          <div className="size-14 animate-pulse rounded-pill bg-surface-hover" />
          <div className="size-11 animate-pulse rounded-pill bg-surface-hover" />
        </div>
        <div className="h-1.5 animate-pulse rounded-pill bg-surface-hover" />
      </section>
    )
  }
  return (
    <section className="grid gap-4" aria-busy="true" aria-label="Loading now playing">
      <div className="grid gap-4">
        <div className={cn('relative mx-auto w-full', artClassName)}>
          <div className="aspect-square w-full animate-pulse rounded-card bg-surface-hover glass:rounded-pill" />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-20 animate-pulse rounded-control bg-surface-hover" />
            <div className="h-8 w-3/4 max-w-xs animate-pulse rounded-control bg-surface-hover" />
            <div className="h-4 w-1/2 max-w-[12rem] animate-pulse rounded-control bg-surface-hover" />
          </div>
          <div className="size-11 shrink-0 animate-pulse rounded-pill bg-surface-hover" />
        </div>
      </div>

      <div className="grid gap-2.5">
        <div className="h-1.5 animate-pulse rounded-pill bg-surface-hover" />
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
      <div className="rounded-card border-ui border-border-subtle bg-surface pr-1.5 pl-3 shadow-card modern:border-transparent">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex min-h-16 items-center gap-2 border-b border-border-subtle py-2 last:border-b-0"
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

type QueueRowAction = 'play' | 'remove' | 'up' | 'down' | 'next' | 'end'

const QueueRow = memo(function QueueRow({
  item,
  itemId,
  index,
  position,
  massUrl,
  rowBusy,
  disabled,
  canManage,
  supportMoveToEnd,
  isFirstMovable,
  isLast,
  onAction,
}: {
  item: QueueItem
  itemId: string
  index: number
  position: number
  massUrl: string | null
  rowBusy: boolean
  disabled: boolean
  canManage: boolean
  supportMoveToEnd: boolean
  isFirstMovable: boolean
  isLast: boolean
  onAction: (action: QueueRowAction, item: QueueItem, itemId: string, index: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const title = queueItemTitle(item) ?? 'Unknown track'
  const artist = queueItemArtist(item)
  const art = queueItemImage(item, massUrl, 160)

  const onPlay = () => onAction('play', item, itemId, index)
  const act = (action: QueueRowAction) => {
    setExpanded(false)
    onAction(action, item, itemId, index)
  }

  return (
    <div
      className={cn(
        'border-b border-border-subtle transition-ui last:border-b-0',
        '[content-visibility:auto] [contain-intrinsic-size:auto_4rem]',
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
          <MediaArt src={art} label="" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] font-semibold text-ink">{title}</p>
            <p className="truncate text-[0.8125rem] text-ink-muted">{artist ?? 'Queued'}</p>
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
            onClick={() => act('play')}
          />
          <ActionChip
            icon={<ListStart className="size-3.5" />}
            label="Play next"
            onClick={() => act('next')}
          />
          {!isFirstMovable ? (
            <ActionChip
              icon={<ArrowUp className="size-3.5" />}
              label="Up"
              onClick={() => act('up')}
            />
          ) : null}
          {!isLast ? (
            <ActionChip
              icon={<ArrowDown className="size-3.5" />}
              label="Down"
              onClick={() => act('down')}
            />
          ) : null}
          {supportMoveToEnd && !isLast ? (
            <ActionChip
              icon={<ListEnd className="size-3.5" />}
              label="To end"
              onClick={() => act('end')}
            />
          ) : null}
          <ActionChip
            danger
            icon={<X className="size-3.5" />}
            label="Remove"
            onClick={() => act('remove')}
          />
        </div>
      ) : null}
    </div>
  )
})

/**
 * The music player and its queue. `view` lets the Music page place the player
 * and the up-next list in different panels; `artClassName` sizes the artwork
 * so the player fits the screen without scrolling. In `player` view the
 * artwork instead fills whatever height is left, so the player always fits.
 * `endlessToggle` puts the Endless Mix switch at the top of the queue, so the
 * player itself stays uncluttered.
 */
export type GroupVolume = {
  value: number
  muted: boolean
  set: (value: number) => Promise<void>
  toggleMute: () => Promise<void>
}

export function QueueManager({
  target,
  onTargetChange,
  view = 'all',
  artClassName = 'max-w-[22rem]',
  endlessToggle = false,
  heading = true,
  groupVolume,
}: {
  target: string
  onTargetChange: (id: string) => void
  view?: 'all' | 'player' | 'queue'
  artClassName?: string
  endlessToggle?: boolean
  /** Show the "Up next" title (off when a tab already says it). */
  heading?: boolean
  /**
   * When several rooms play together, the player's volume and mute act on the
   * whole group instead of just the leader.
   */
  groupVolume?: GroupVolume
}) {
  const showPlayer = view !== 'queue'
  const showQueue = view !== 'player'
  const { callService } = useServiceCall()
  // The player view drives refreshes; a queue view next to it only reads the shared query.
  const queueApi = useMusicQueue(target, { primary: view !== 'queue' })
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
    endlessMixEnabled,
    shuffleEnabled,
    repeatMode,
  } = queueApi
  const [busy, setBusy] = useState<string | null>(null)
  const [skipping, setSkipping] = useState<'prev' | 'next' | null>(null)
  const [visibleCount, setVisibleCount] = useState(ROW_PAGE)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const { value: isPlaying, commit: commitPlaying } = useOptimisticValue(player.isPlaying)
  const { value: isMuted, commit: commitMuted } = useOptimisticValue(
    Boolean(groupVolume ? groupVolume.muted : player.isMuted),
  )
  const serverVolume = groupVolume?.value ?? Math.round((player.volumeLevel ?? 0) * 100)
  const [volume, setVolume] = useState(serverVolume)

  // Drop the confirm prompt if it's ignored or the room changes.
  useEffect(() => {
    if (!confirmClear) return
    const id = window.setTimeout(() => setConfirmClear(false), 4_000)
    return () => window.clearTimeout(id)
  }, [confirmClear])
  useEffect(() => {
    setConfirmClear(false)
    setVisibleCount(ROW_PAGE)
  }, [target])
  useEffect(() => {
    setVolume(serverVolume)
  }, [serverVolume])

  const currentTitle = queueItemTitle(queue?.current_item) ?? player.mediaTitle
  const currentArtist = queueItemArtist(queue?.current_item) ?? player.mediaArtist
  const playerArt = playerArtSources(player.attributes, haUrl)
  const queueArt = queueItemImage(queue?.current_item, massUrl, 512)
  const playerArtKey = playerArt.join('|')
  // biome-ignore lint/correctness/useExhaustiveDependencies: playerArtKey is the by-value key for playerArt
  const currentArtSources = useMemo(
    () => uniqueArtCandidates(queueArt, ...playerArt),
    [queueArt, playerArtKey],
  )
  const duration = player.mediaDuration ?? queue?.current_item?.duration ?? null

  const shuffle = shuffleEnabled
  const repeat = repeatMode
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

  // The server sends one page of the queue; `queue.items` is the full length.
  const totalUpNext =
    queue && queue.items > 0 && queue.current_index != null
      ? Math.max(queue.items - queue.current_index - 1, upNext.length)
      : upNext.length
  const fullyLoaded = totalUpNext <= upNext.length
  const visibleUpNext = useMemo(() => upNext.slice(0, visibleCount), [upNext, visibleCount])
  const hiddenCount = totalUpNext - visibleUpNext.length

  const upNextDuration = useMemo(
    () => upNext.reduce((sum, { item }) => sum + (item.duration ?? 0), 0),
    [upNext],
  )

  // Warm the cache with the next track's artwork so the change is instant.
  const nextArt = queueItemImage(upNext[0]?.item ?? queue?.next_item, massUrl, 512)
  useEffect(() => {
    if (!nextArt || !showPlayer) return
    const img = new Image()
    img.referrerPolicy = 'no-referrer'
    img.decoding = 'async'
    img.src = nextArt
  }, [nextArt, showPlayer])

  const handleShowMore = () => {
    const next = visibleCount + ROW_PAGE
    setVisibleCount(next)
    if (next > upNext.length && !fullyLoaded) queueApi.loadMore()
  }

  const unavailable = player.isUnavailable
  const hasNowPlaying = Boolean(currentTitle) && (isPlaying || player.isPaused || items.length > 0)
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

  const handleSkip = async (direction: 'prev' | 'next') => {
    setSkipping(direction)
    try {
      await (direction === 'prev' ? player.previousTrack() : player.nextTrack())
    } catch (e) {
      notify(
        direction === 'prev' ? 'Previous failed' : 'Next failed',
        e instanceof Error ? e.message : 'Error',
      )
    } finally {
      setSkipping(null)
    }
  }

  // Rows get one stable handler so memoized rows skip re-rendering when the hook updates.
  const rowActionRef = useRef<
    (action: QueueRowAction, item: QueueItem, itemId: string, index: number) => void
  >(() => {})
  useEffect(() => {
    rowActionRef.current = (action, item, itemId, index) => {
      const actions: Record<QueueRowAction, () => Promise<void>> = {
        play: () => queueApi.playIndex(item.queue_item_id ?? String(index)),
        remove: () => queueApi.removeItem(itemId),
        up: () => queueApi.moveUp(itemId),
        down: () => queueApi.moveDown(itemId),
        next: () => queueApi.playNext(itemId),
        end: () => queueApi.moveToEnd(itemId),
      }
      const failLabel =
        action === 'play' ? 'Play failed' : action === 'remove' ? 'Remove failed' : 'Move failed'
      void run(itemId, actions[action], failLabel)
    }
  })
  const handleRowAction = useCallback(
    (action: QueueRowAction, item: QueueItem, itemId: string, index: number) =>
      rowActionRef.current(action, item, itemId, index),
    [],
  )

  /** Instant toggles — optimistic UI in the hook; don't lock the whole player. */
  function runToggle(action: () => Promise<void>, failLabel: string) {
    void action().catch((e) => {
      notify(failLabel, e instanceof Error ? e.message : 'Error')
    })
  }

  const togglePlayback = () => {
    const next = !isPlaying
    commitPlaying(next, async () => {
      try {
        if (isPlaying) await player.pause()
        else await player.play()
      } catch (e) {
        notify('Playback failed', e instanceof Error ? e.message : 'Error')
        throw e
      }
    })
  }

  const toggleMute = () => {
    commitMuted(!isMuted, async () => {
      try {
        await (groupVolume ? groupVolume.toggleMute() : player.toggleMute())
      } catch (e) {
        notify('Mute failed', e instanceof Error ? e.message : 'Error')
        throw e
      }
    })
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

  function toggleEndless(next = !endlessMixEnabled) {
    if (next === endlessMixEnabled) return
    runToggle(async () => {
      await queueApi.setEndlessMix(next)
      notify(
        next ? 'Endless Mix on' : 'Endless Mix off',
        next ? 'Similar tracks will keep playing' : 'Queue will stop when it ends',
      )
    }, 'Endless Mix failed')
  }

  return (
    <div
      className={cn(
        view === 'all' ? 'space-y-5' : 'grid gap-5',
        view === 'player' && 'flex h-full min-h-0 flex-col',
      )}
    >
      {endlessToggle ? (
        <div className="flex items-center justify-between gap-4 rounded-card border-ui border-border-subtle bg-surface px-4 py-2.5 shadow-card modern:border-transparent">
          <div className="flex min-w-0 items-center gap-3">
            <Radio className="size-5 shrink-0 text-ink-muted" />
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-semibold text-ink">Endless Mix</p>
              <p className="truncate text-[0.8125rem] text-ink-muted">
                Keep playing similar tracks
              </p>
            </div>
          </div>
          <Switch
            aria-label="Endless Mix"
            checked={endlessMixEnabled}
            disabled={unavailable || (!hasNowPlaying && !endlessMixEnabled)}
            onCheckedChange={(checked) => toggleEndless(checked)}
          />
        </div>
      ) : null}

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
        <section
          className={cn(
            'grid gap-4',
            view === 'player' && 'flex min-h-0 flex-1 flex-col justify-center',
            // Portrait tablet: artwork on the left, everything else beside it.
            view === 'player' &&
              '@xl:portrait:grid @xl:portrait:grid-cols-[minmax(10rem,15rem)_minmax(0,1fr)] @xl:portrait:content-center @xl:portrait:gap-x-8 @xl:portrait:gap-y-3',
          )}
          aria-label="Now playing"
        >
          <div
            className={cn(
              'grid gap-4',
              view === 'player' && 'flex min-h-0 shrink flex-col @xl:portrait:contents',
            )}
          >
            {view === 'player' ? (
              // The artwork takes whatever height is left, so the player always fits.
              <div className="grid aspect-square min-h-0 w-full shrink place-items-center [container-type:size] @xl:portrait:col-start-1 @xl:portrait:row-span-4 @xl:portrait:row-start-1 @xl:portrait:self-center">
                <div className="size-[calc(min(100cqw,100cqh)-12px)]">
                  <MediaArt sources={currentArtSources} label="Now playing artwork" size="hero" />
                </div>
              </div>
            ) : (
              <div className={cn('relative mx-auto w-full', artClassName)}>
                <MediaArt sources={currentArtSources} label="Now playing artwork" size="hero" />
              </div>
            )}

            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                {view === 'player' ? null : (
                  <p className="text-label mb-1">{isPlaying ? 'Now playing' : 'Paused'}</p>
                )}
                <p
                  className={cn(
                    'text-display line-clamp-2 text-[1.75rem] leading-[1.1] text-ink',
                    view === 'player' &&
                      'line-clamp-none truncate pb-0.5 text-[1.625rem] leading-[1.2]',
                  )}
                >
                  {currentTitle ?? 'Unknown track'}
                </p>
                {currentArtist ? (
                  <p className="mt-0.5 truncate text-[0.9375rem] text-ink-muted">{currentArtist}</p>
                ) : null}
              </div>
              <div className="relative shrink-0">
                {view === 'player' ? (
                  ensuring ? (
                    <Loader2
                      className="m-3 size-5 animate-spin text-ink-faint"
                      aria-label="Connecting to Music Assistant"
                    />
                  ) : null
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

          <PlaybackProgress
            player={player}
            duration={duration}
            playing={isPlaying}
            disabled={unavailable}
          />

          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              className={cn(
                'grid size-11 place-items-center rounded-pill text-ink-muted transition-ui hover:text-ink',
                shuffle && 'bg-accent-soft text-ink',
              )}
              disabled={unavailable}
              aria-label={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
              aria-pressed={shuffle}
              onClick={() => runToggle(() => queueApi.setShuffle(!shuffle), 'Shuffle failed')}
            >
              <Shuffle className="size-[18px]" />
            </button>
            <button
              type="button"
              className="grid size-14 place-items-center rounded-pill text-ink disabled:opacity-40"
              disabled={unavailable || skipping === 'prev'}
              aria-label="Previous"
              aria-busy={skipping === 'prev'}
              onClick={() => void handleSkip('prev')}
            >
              {skipping === 'prev' ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                <SkipBack className="size-6 fill-current" />
              )}
            </button>
            <button
              type="button"
              className="press grid size-[4.5rem] place-items-center rounded-pill bg-accent text-on-accent disabled:opacity-40 @xl:size-19"
              disabled={unavailable}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              onClick={togglePlayback}
            >
              {isPlaying ? (
                <Pause className="size-7 fill-current" />
              ) : (
                <Play className="size-7 fill-current" />
              )}
            </button>
            <button
              type="button"
              className="grid size-14 place-items-center rounded-pill text-ink disabled:opacity-40"
              disabled={unavailable || skipping === 'next'}
              aria-label="Next"
              aria-busy={skipping === 'next'}
              onClick={() => void handleSkip('next')}
            >
              {skipping === 'next' ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                <SkipForward className="size-6 fill-current" />
              )}
            </button>
            <button
              type="button"
              className={cn(
                'grid size-11 place-items-center rounded-pill text-ink-muted transition-ui hover:text-ink',
                repeat !== 'off' && 'bg-accent-soft text-ink',
              )}
              disabled={unavailable}
              aria-label={repeatModeLabel(repeat)}
              aria-pressed={repeat !== 'off'}
              onClick={() =>
                runToggle(() => queueApi.setRepeat(nextRepeatMode(repeat)), 'Repeat failed')
              }
            >
              {repeat === 'one' ? (
                <Repeat1 className="size-[18px]" />
              ) : (
                <Repeat className="size-[18px]" />
              )}
            </button>
          </div>

          {view === 'player' ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-pill text-ink-muted transition-ui hover:text-ink"
                disabled={unavailable}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                aria-pressed={isMuted}
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX className="size-5" /> : <Volume1 className="size-5" />}
              </button>
              <Slider
                size="thin"
                className="min-w-0 flex-1"
                aria-label="Volume"
                min={0}
                max={100}
                step={1}
                disabled={unavailable}
                value={volume}
                onValueChange={(value) => {
                  setVolume(Array.isArray(value) ? value[0] : value)
                }}
                onValueCommitted={(value) => {
                  const next = Array.isArray(value) ? value[0] : value
                  setVolume(next)
                  void (groupVolume ? groupVolume.set(next) : player.setVolume(next / 100)).catch(
                    (e) => notify('Volume failed', e instanceof Error ? e.message : 'Error'),
                  )
                }}
              />
              <Volume2 className="mx-3 size-5 shrink-0 text-ink-faint" aria-hidden />
            </div>
          ) : null}

          <div className={cn('flex justify-center', view === 'player' && 'hidden')}>
            <button
              type="button"
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-pill border-ui border-border-subtle px-3 text-xs font-semibold text-ink-muted transition-ui hover:text-ink @xl:h-11 @xl:gap-2 @xl:px-4 @xl:text-sm',
                endlessMixEnabled && 'border-transparent bg-accent-soft text-ink',
              )}
              disabled={unavailable || (!hasNowPlaying && !endlessMixEnabled)}
              aria-label={endlessMixEnabled ? 'Turn off Endless Mix' : 'Turn on Endless Mix'}
              aria-pressed={endlessMixEnabled}
              onClick={() => toggleEndless()}
            >
              <Radio className="size-3.5 @xl:size-4" />
              Endless Mix
            </button>
          </div>
        </section>
      ) : null}

      {showQueue && upNext.length > 0 ? (
        <div className="space-y-2.5">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h3
                className={cn(
                  heading ? 'block' : 'sr-only',
                  'text-ink walnut:font-serif walnut:text-xl walnut:italic modern:text-[0.8125rem] modern:font-semibold modern:text-ink-muted glass:text-base glass:font-semibold glass:text-ink',
                )}
              >
                Up next
              </h3>
              <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                <span>
                  {totalUpNext} {totalUpNext === 1 ? 'track' : 'tracks'}
                  {fullyLoaded && upNextDuration > 0 ? ` · ${formatDuration(upNextDuration)}` : ''}
                  {endlessMixEnabled ? ' · Endless Mix' : ''}
                </span>
                {fetching && !loading ? (
                  <Loader2 className="size-3 animate-spin text-ink-faint" aria-label="Refreshing" />
                ) : null}
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
              'rounded-card border-ui border-border-subtle bg-surface pr-1.5 pl-3 shadow-card modern:border-transparent',
            )}
          >
            <div>
              {visibleUpNext.map(({ item, index }, rowIndex) => {
                const itemId = item.queue_item_id ?? `idx-${index}`
                return (
                  <QueueRow
                    key={item.queue_item_id ?? `q-${index}`}
                    item={item}
                    itemId={itemId}
                    index={index}
                    position={rowIndex + 1}
                    massUrl={massUrl}
                    rowBusy={busy === itemId}
                    disabled={unavailable || busy !== null}
                    canManage={canManageItems}
                    supportMoveToEnd={!viaMassQueue}
                    isFirstMovable={
                      currentIndex == null ? index === 0 : index <= currentIndex + 1
                    }
                    isLast={fullyLoaded && index === items.length - 1}
                    onAction={handleRowAction}
                  />
                )
              })}
            </div>
            {hiddenCount > 0 ? (
              <button
                type="button"
                className="flex min-h-12 w-full items-center justify-center gap-2 border-t border-border-subtle text-sm font-semibold text-ink-muted transition-ui hover:text-ink"
                disabled={fetching && visibleCount >= upNext.length}
                onClick={handleShowMore}
              >
                {fetching && visibleCount >= upNext.length ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Show more ({hiddenCount} left)
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
