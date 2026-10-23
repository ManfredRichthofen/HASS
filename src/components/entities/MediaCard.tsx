import { useMediaPlayer } from 'hass-react'
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '#/components/ui/button'
import { Slider } from '#/components/ui/slider'
import { notify } from '#/components/ui/toast'
import { useOptimisticValue } from '#/hooks/useOptimisticValue'
import { cn } from '#/lib/cn'
import { entityName } from '#/lib/entityName'

export function MediaCard({
  entityId,
  compact = false,
}: {
  entityId: string
  /** `auto` collapses when idle so callers don't need a second useMediaPlayer. */
  compact?: boolean | 'auto'
}) {
  const player = useMediaPlayer(entityId)
  const name = entityName(entityId, player.attributes.friendly_name)
  const unavailable = player.isUnavailable
  const { value: isPlaying, commit: commitPlaying } = useOptimisticValue(player.isPlaying)
  const { value: isMuted, commit: commitMuted } = useOptimisticValue(Boolean(player.isMuted))
  const serverVolume = Math.round((player.volumeLevel ?? 0) * 100)
  const [volume, setVolume] = useState(serverVolume)
  const isActive = player.isPlaying || player.isPaused
  const showCompact = compact === 'auto' ? !isActive : compact
  // Music Assistant / Sonos keep last track in attributes while idle — don't show it as current.
  const title = isActive
    ? (player.mediaTitle ?? 'Nothing playing')
    : player.isOff
      ? 'Off'
      : 'Nothing playing'
  const artist = isActive ? player.mediaArtist : undefined

  useEffect(() => {
    setVolume(serverVolume)
  }, [serverVolume])

  async function run(action: () => Promise<void>, label: string) {
    try {
      await action()
    } catch (e) {
      notify(label, e instanceof Error ? e.message : 'Error')
    }
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
        await player.toggleMute()
      } catch (e) {
        notify('Mute failed', e instanceof Error ? e.message : 'Error')
        throw e
      }
    })
  }

  if (showCompact) {
    return (
      <button
        type="button"
        disabled={unavailable}
        onClick={togglePlayback}
        className={cn(
          'flex min-h-14 w-full items-center gap-3 rounded-card border-ui border-border-subtle bg-surface shadow-card modern:border-transparent p-3 text-left transition-ui hover:bg-surface-hover',
          unavailable && 'opacity-40',
        )}
      >
        <span className="grid size-11 place-items-center rounded-control bg-canvas text-accent">
          {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
          <p className="truncate text-xs text-ink-muted">{artist ?? name}</p>
        </div>
      </button>
    )
  }

  return (
    <div
      className={cn(
        'min-w-0 overflow-hidden rounded-card border-ui border-border-subtle bg-surface shadow-card modern:border-transparent p-4',
        isActive && 'border-success/30',
        unavailable && 'opacity-40',
      )}
    >
      <div className="mb-4">
        <p className="text-sm font-medium text-ink-muted">{name}</p>
        <h3 className="mt-1 truncate text-display text-lg text-ink">{title}</h3>
        {artist ? <p className="truncate text-sm text-ink-muted">{artist}</p> : null}
      </div>

      <div className="mb-4 flex items-center justify-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          disabled={unavailable}
          onClick={() => void run(() => player.previousTrack(), 'Previous failed')}
        >
          <SkipBack className="size-5" />
        </Button>
        <Button size="icon" variant="accent" disabled={unavailable} onClick={togglePlayback}>
          {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          disabled={unavailable}
          onClick={() => void run(() => player.nextTrack(), 'Next failed')}
        >
          <SkipForward className="size-5" />
        </Button>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="grid size-11 shrink-0 place-items-center rounded-control text-ink-muted transition-ui hover:bg-canvas hover:text-ink"
          disabled={unavailable}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          onClick={toggleMute}
        >
          {isMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </button>
        <Slider
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
            void run(() => player.setVolume(next / 100), 'Volume failed')
          }}
        />
      </div>
    </div>
  )
}

/** Compact when idle; expands to full controls while playing/paused. */
export function MediaPlayerRow({ entityId }: { entityId: string }) {
  return <MediaCard entityId={entityId} compact="auto" />
}
