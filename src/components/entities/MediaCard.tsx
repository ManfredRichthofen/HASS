import { useMediaPlayer } from 'hass-react'
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { entityName } from '#/lib/entityName'
import { cn } from '#/lib/cn'
import { Button } from '#/components/ui/button'
import { Slider } from '#/components/ui/slider'
import { notify } from '#/components/ui/toast'

export function MediaCard({
  entityId,
  compact = false,
}: {
  entityId: string
  compact?: boolean
}) {
  const player = useMediaPlayer(entityId)
  const name = entityName(entityId, player.attributes.friendly_name)
  const unavailable = player.isUnavailable
  const title = player.mediaTitle ?? (player.isOff ? 'Off' : 'Nothing playing')
  const artist = player.mediaArtist

  async function run(action: () => Promise<void>, label: string) {
    try {
      await action()
    } catch (e) {
      notify(label, e instanceof Error ? e.message : 'Error')
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        disabled={unavailable}
        onClick={() =>
          void run(
            () => (player.isPlaying ? player.pause() : player.play()),
            'Playback failed',
          )
        }
        className={cn(
          'flex w-full items-center gap-3 rounded-3xl border border-border-subtle bg-surface p-3 text-left transition hover:bg-surface-hover',
          unavailable && 'opacity-40',
        )}
      >
        <span className="grid size-11 place-items-center rounded-2xl bg-canvas text-accent">
          {player.isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
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
        'rounded-[1.75rem] border border-border-subtle bg-surface p-4',
        unavailable && 'opacity-40',
      )}
    >
      <div className="mb-4">
        <p className="text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">
          {name}
        </p>
        <h3 className="mt-1 truncate font-display text-lg font-semibold text-ink">
          {title}
        </h3>
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
        <Button
          size="icon"
          variant="accent"
          disabled={unavailable}
          onClick={() =>
            void run(
              () => (player.isPlaying ? player.pause() : player.play()),
              'Playback failed',
            )
          }
        >
          {player.isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
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

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="text-ink-muted hover:text-ink"
          disabled={unavailable}
          onClick={() => void run(() => player.toggleMute(), 'Mute failed')}
        >
          {player.isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
        <Slider
          aria-label="Volume"
          min={0}
          max={100}
          step={1}
          disabled={unavailable}
          value={Math.round(player.volumeLevel * 100)}
          onValueCommitted={(value) => {
            const next = Array.isArray(value) ? value[0] : value
            void run(() => player.setVolume(next / 100), 'Volume failed')
          }}
        />
      </div>
    </div>
  )
}
