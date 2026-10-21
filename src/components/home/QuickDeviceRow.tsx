import { Link } from '@tanstack/react-router'
import { useMediaPlayer, useVacuum } from 'hass-react'
import { ChevronRight, Music2, Pause, Play, RobotVacuum } from 'lucide-react'
import { type MouseEvent, useState } from 'react'
import { VacuumSheet } from '#/components/entities/VacuumSheet'
import { CardGrid } from '#/components/layout/CardGrid'
import { Drawer, DrawerContent } from '#/components/ui/drawer'
import { notify } from '#/components/ui/toast'
import { entities } from '#/config/dashboard'
import { cn } from '#/lib/cn'
import { AnimatePresence, m, snappy, swapIcon, swapText, tap } from '#/lib/motion'

export function QuickDeviceRow({ className }: { className?: string }) {
  const player = useMediaPlayer(entities.mediaAll)
  const vacuum = useVacuum(entities.vacuum)
  const [vacuumOpen, setVacuumOpen] = useState(false)

  const isActive = player.isPlaying || player.isPaused
  const musicTitle = isActive
    ? [player.mediaTitle, player.mediaArtist].filter(Boolean).join(' · ') || 'Playing'
    : 'Nothing playing. Tap to search.'

  const vacuumStatus = vacuum.isUnavailable
    ? 'Unavailable'
    : vacuum.isDocked
      ? 'Docked'
      : vacuum.isCleaning
        ? 'Cleaning'
        : vacuum.isReturning
          ? 'Returning'
          : (vacuum.status ?? vacuum.state)
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

  return (
    <>
      <CardGrid className={className}>
        <div
          className={cn(
            'min-w-0 rounded-2xl border transition-state',
            player.isPlaying ? 'border-success/35 bg-success/5' : 'border-border-subtle bg-surface',
          )}
        >
          <Link to="/media" className="flex min-h-14 items-center gap-3 p-3.5">
            <span
              className={cn(
                'grid size-11 shrink-0 place-items-center rounded-xl bg-success/15 text-success',
                player.isPlaying && 'animate-pulse',
              )}
            >
              <Music2 className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Music</p>
              <p className="truncate text-xs text-ink-muted">{musicTitle}</p>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              {isActive ? (
                <m.button
                  key={player.isPlaying ? 'pause' : 'play'}
                  type="button"
                  initial={swapIcon.initial}
                  animate={swapIcon.animate}
                  exit={swapIcon.exit}
                  transition={swapIcon.transition}
                  whileTap={tap.hard}
                  onClick={(e) => void togglePlayback(e)}
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-canvas text-ink"
                  aria-label={player.isPlaying ? 'Pause' : 'Play'}
                >
                  {player.isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                </m.button>
              ) : (
                <m.span
                  key="chevron"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="shrink-0"
                >
                  <ChevronRight className="size-5 text-ink-faint" />
                </m.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        <m.button
          type="button"
          whileTap={tap.soft}
          transition={snappy}
          disabled={vacuum.isUnavailable}
          onClick={() => setVacuumOpen(true)}
          className={cn(
            'flex min-h-14 min-w-0 items-center gap-3 rounded-2xl border p-3.5 text-left transition-state disabled:opacity-40',
            vacuum.isCleaning ? 'border-info/35 bg-info/5' : 'border-border-subtle bg-surface',
          )}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-info/15 text-info">
            <RobotVacuum className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Vacuum</p>
            <AnimatePresence mode="popLayout" initial={false}>
              <m.p
                key={vacuumLabel}
                initial={swapText.initial}
                animate={swapText.animate}
                exit={swapText.exit}
                transition={swapText.transition}
                className="truncate text-xs capitalize text-ink-muted"
              >
                {vacuumLabel}
              </m.p>
            </AnimatePresence>
          </div>
          <ChevronRight className="size-5 shrink-0 text-ink-faint" />
        </m.button>
      </CardGrid>

      <Drawer open={vacuumOpen} onOpenChange={setVacuumOpen}>
        <DrawerContent title="Vacuum">
          <VacuumSheet entityId={entities.vacuum} />
        </DrawerContent>
      </Drawer>
    </>
  )
}
