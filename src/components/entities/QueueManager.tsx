import { useServiceCall } from 'hass-react'
import {
  ListMusic,
  Loader2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '#/components/ui/button'
import { Progress } from '#/components/ui/progress'
import { notify } from '#/components/ui/toast'
import { useMusicQueue } from '#/hooks/useMusicQueue'
import { cn } from '#/lib/cn'
import {
  formatDuration,
  mediaTargets,
  nextRepeatMode,
  queueItemArtist,
  queueItemImage,
  queueItemTitle,
  repeatModeLabel,
} from '#/lib/musicAssistant'

function Artwork({
  src,
  label,
  size = 'lg',
}: {
  src: string | null | undefined
  label: string
  size?: 'sm' | 'lg'
}) {
  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden rounded-xl bg-border',
        size === 'lg' ? 'size-16 sm:size-[4.5rem]' : 'size-12',
      )}
    >
      {src ? (
        <img src={src} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <div className="grid size-full place-items-center text-ink-faint">
          <ListMusic className={size === 'lg' ? 'size-6' : 'size-4'} />
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
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [playing])

  const live = playing ? base.position + (now - base.at) / 1000 : (position ?? 0)
  const clamped = duration != null ? Math.min(Math.max(live, 0), duration) : Math.max(live, 0)
  const pct = duration && duration > 0 ? Math.min(100, (clamped / duration) * 100) : 0
  return { position: clamped, pct }
}

export function QueueManager({
  target,
  onTargetChange,
}: {
  target: string
  onTargetChange: (id: string) => void
}) {
  const { callService } = useServiceCall()
  const { queue, loading, fetching, refresh, player } = useMusicQueue(target)
  const [busy, setBusy] = useState<string | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)

  const currentTitle = queueItemTitle(queue?.current_item) ?? player.mediaTitle
  const currentArtist = queueItemArtist(queue?.current_item) ?? player.mediaArtist
  const attrs = player.attributes as { entity_picture?: unknown }
  const entityPicture = typeof attrs.entity_picture === 'string' ? attrs.entity_picture : null
  const currentArt = queueItemImage(queue?.current_item) ?? entityPicture
  const nextTitle = queueItemTitle(queue?.next_item)
  const nextArtist = queueItemArtist(queue?.next_item)
  const nextArt = queueItemImage(queue?.next_item)

  const duration = player.mediaDuration ?? queue?.current_item?.duration ?? null
  const { position, pct } = useLivePosition(player.mediaPosition, duration, player.isPlaying)

  const shuffle = player.shuffle ?? queue?.shuffle_enabled ?? false
  const repeat = (player.repeat ?? queue?.repeat_mode ?? 'off').toLowerCase()
  const itemCount = queue?.items ?? 0
  const hasQueue =
    Boolean(queue?.current_item) || itemCount > 0 || player.isPlaying || player.isPaused
  const unavailable = player.isUnavailable

  const transferTargets = useMemo(
    () => mediaTargets.filter((playerTarget) => playerTarget.id !== target),
    [target],
  )

  async function run(key: string, action: () => Promise<void>, failLabel: string) {
    setBusy(key)
    try {
      await action()
      await refresh()
    } catch (e) {
      notify(failLabel, e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(null)
    }
  }

  async function clearQueue() {
    await run(
      'clear',
      () => callService('media_player', 'clear_playlist', { entity_id: target }),
      'Clear failed',
    )
  }

  async function transferTo(destination: string) {
    setTransferOpen(false)
    await run(
      'transfer',
      () =>
        callService('music_assistant', 'transfer_queue', {
          entity_id: destination,
          source_player: target,
          auto_play: true,
        }),
      'Transfer failed',
    )
    onTargetChange(destination)
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface p-3.5 sm:space-y-4 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-muted">Music Assistant</p>
          <h3 className="mt-0.5 font-display text-lg font-semibold text-ink">Queue</h3>
        </div>
        {fetching && !loading ? (
          <Loader2 className="mt-1 size-4 shrink-0 animate-spin text-ink-faint" />
        ) : null}
      </div>

      <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {mediaTargets.map((playerTarget) => (
          <button
            key={playerTarget.id}
            type="button"
            onClick={() => onTargetChange(playerTarget.id)}
            className={cn(
              'touch-target shrink-0 rounded-xl border px-3 text-xs font-medium transition-ui',
              target === playerTarget.id
                ? 'border-accent/40 bg-accent-soft text-accent'
                : 'border-border-subtle bg-canvas text-ink-muted hover:text-ink',
            )}
          >
            {playerTarget.label}
          </button>
        ))}
      </div>

      {loading && !queue ? (
        <p className="py-8 text-center text-sm text-ink-muted">Loading queue…</p>
      ) : null}

      {!loading && !hasQueue ? (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-canvas/50 px-4 py-8 text-center">
          <ListMusic className="mx-auto size-7 text-ink-faint" />
          <p className="mt-3 text-sm font-medium text-ink">Nothing in the queue</p>
          <p className="mt-1 text-xs text-ink-muted">Search below and play or add tracks.</p>
        </div>
      ) : null}

      {hasQueue ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border-subtle bg-canvas/60 p-3">
            <div className="flex gap-3">
              <Artwork src={currentArt} label="Now playing artwork" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                  Now playing
                </p>
                <p className="mt-0.5 truncate font-display text-base font-semibold text-ink">
                  {currentTitle ?? 'Unknown track'}
                </p>
                {currentArtist ? (
                  <p className="truncate text-sm text-ink-muted">{currentArtist}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              <Progress value={pct} aria-label="Playback progress" />
              <div className="flex justify-between text-[11px] tabular-nums text-ink-faint">
                <span>{formatDuration(position)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={unavailable || busy !== null}
                  aria-label="Previous"
                  onClick={() => void run('prev', () => player.previousTrack(), 'Previous failed')}
                >
                  <SkipBack className="size-5" />
                </Button>
                <Button
                  size="icon"
                  variant="accent"
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
                    <Loader2 className="size-5 animate-spin" />
                  ) : player.isPlaying ? (
                    <Pause className="size-5" />
                  ) : (
                    <Play className="size-5 fill-current" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={unavailable || busy !== null}
                  aria-label="Next"
                  onClick={() => void run('next', () => player.nextTrack(), 'Next failed')}
                >
                  <SkipForward className="size-5" />
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={unavailable || busy !== null}
                  aria-label={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
                  aria-pressed={shuffle}
                  className={cn(shuffle && 'text-accent')}
                  onClick={() =>
                    void run('shuffle', () => player.setShuffle(!shuffle), 'Shuffle failed')
                  }
                >
                  <Shuffle className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={unavailable || busy !== null}
                  aria-label={repeatModeLabel(repeat)}
                  aria-pressed={repeat !== 'off'}
                  className={cn(repeat !== 'off' && 'text-accent')}
                  onClick={() =>
                    void run(
                      'repeat',
                      () => player.setRepeat(nextRepeatMode(repeat)),
                      'Repeat failed',
                    )
                  }
                >
                  {repeat === 'one' ? (
                    <Repeat1 className="size-4" />
                  ) : (
                    <Repeat className="size-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={unavailable || busy !== null || itemCount === 0}
                  aria-label="Clear queue"
                  onClick={() => void clearQueue()}
                >
                  {busy === 'clear' ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {queue?.next_item ? (
            <div className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-canvas/40 p-2.5">
              <Artwork src={nextArt} label="Up next artwork" size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                  Up next
                </p>
                <p className="truncate text-sm font-semibold text-ink">
                  {nextTitle ?? 'Unknown track'}
                </p>
                {nextArtist ? (
                  <p className="truncate text-xs text-ink-muted">{nextArtist}</p>
                ) : null}
              </div>
              {queue.next_item.duration != null ? (
                <span className="shrink-0 text-xs tabular-nums text-ink-faint">
                  {formatDuration(queue.next_item.duration)}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
            <p>
              {itemCount > 0 ? (
                <>
                  <span className="font-medium text-ink">{itemCount}</span> in queue
                  {queue?.current_index != null ? <> · #{queue.current_index + 1}</> : null}
                </>
              ) : (
                'Queue empty'
              )}
              {queue?.is_dynamic || queue?.autoplay_enabled ? ' · Radio mode' : null}
              {shuffle ? ' · Shuffle' : null}
              {repeat !== 'off' ? ` · ${repeatModeLabel(repeat)}` : null}
            </p>

            <div className="relative">
              <Button
                size="sm"
                variant="secondary"
                disabled={unavailable || busy !== null || transferTargets.length === 0}
                onClick={() => setTransferOpen((open) => !open)}
              >
                {busy === 'transfer' ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Transfer
              </Button>
              {transferOpen ? (
                <div className="absolute right-0 bottom-full z-10 mb-1 min-w-[10rem] overflow-hidden rounded-xl border border-border bg-canvas-elevated shadow-lg">
                  {transferTargets.map((dest) => (
                    <button
                      key={dest.id}
                      type="button"
                      className="block w-full px-3 py-2.5 text-left text-sm text-ink transition-ui hover:bg-surface-hover"
                      onClick={() => void transferTo(dest.id)}
                    >
                      {dest.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
