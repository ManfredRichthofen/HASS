import type { MouseEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { useMediaPlayer, useVacuum } from 'hass-react'
import {
  ChevronRight,
  Music2,
  Pause,
  Play,
  RobotVacuum,
  Square,
} from 'lucide-react'
import { entities } from '#/config/dashboard'
import { cn } from '#/lib/cn'
import { notify } from '#/components/ui/toast'

export function QuickDeviceRow() {
  const player = useMediaPlayer(entities.mediaAll)
  const vacuum = useVacuum(entities.vacuum)

  const isActive = player.isPlaying || player.isPaused
  const musicTitle = isActive
    ? [player.mediaTitle, player.mediaArtist].filter(Boolean).join(' · ') ||
      'Playing'
    : 'Nothing playing. Tap to search.'

  const vacuumStatus = vacuum.isUnavailable
    ? 'Unavailable'
    : vacuum.isDocked
      ? 'Docked'
      : vacuum.isCleaning
        ? 'Cleaning'
        : vacuum.isReturning
          ? 'Returning'
          : vacuum.status ?? vacuum.state
  const vacuumLabel =
    vacuum.batteryLevel != null && !vacuum.isUnavailable
      ? `${vacuumStatus} · ${vacuum.batteryLevel}%`
      : vacuumStatus

  async function togglePlayback(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    try {
      if (player.isPlaying) await player.pause()
      else await player.play()
    } catch (err) {
      notify('Music failed', err instanceof Error ? err.message : 'Error')
    }
  }

  async function vacuumAction(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    try {
      if (vacuum.isCleaning || vacuum.isReturning) await vacuum.returnToBase()
      else await vacuum.start()
    } catch (err) {
      notify('Vacuum failed', err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div className="space-y-2">
      <Link
        to="/media"
        className={cn(
          'flex items-center gap-3 rounded-3xl border border-border-subtle bg-surface p-3.5 transition hover:border-accent/30',
          player.isPlaying && 'border-success/35 bg-success/5',
        )}
      >
        <span
          className={cn(
            'grid size-11 place-items-center rounded-2xl bg-success/15 text-success',
            player.isPlaying && 'animate-pulse',
          )}
        >
          <Music2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
            Music
          </p>
          <p className="truncate text-sm font-medium text-ink">{musicTitle}</p>
        </div>
        {isActive ? (
          <button
            type="button"
            onClick={(e) => void togglePlayback(e)}
            className="grid size-10 place-items-center rounded-full bg-canvas text-ink"
            aria-label={player.isPlaying ? 'Pause' : 'Play'}
          >
            {player.isPlaying ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </button>
        ) : (
          <ChevronRight className="size-4 text-ink-faint" />
        )}
      </Link>

      <div
        className={cn(
          'flex items-center gap-3 rounded-3xl border border-border-subtle bg-surface p-3.5',
          vacuum.isCleaning && 'border-info/35 bg-info/5',
        )}
      >
        <span className="grid size-11 place-items-center rounded-2xl bg-info/15 text-info">
          <RobotVacuum className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
            Vacuum
          </p>
          <p className="truncate text-sm font-medium capitalize text-ink">
            {vacuumLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => void vacuumAction(e)}
          disabled={vacuum.isUnavailable}
          className="grid size-10 place-items-center rounded-full bg-canvas text-ink disabled:opacity-40"
          aria-label={
            vacuum.isCleaning || vacuum.isReturning ? 'Send home' : 'Start'
          }
        >
          {vacuum.isCleaning || vacuum.isReturning ? (
            <Square className="size-3.5" />
          ) : (
            <Play className="size-4" />
          )}
        </button>
      </div>
    </div>
  )
}
