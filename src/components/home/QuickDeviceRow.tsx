import { Link } from '@tanstack/react-router'
import { useMediaPlayer, useVacuum } from 'hass-react'
import { ChevronRight, Music2, Pause, Play, RobotVacuum } from 'lucide-react'
import { type MouseEvent, useState } from 'react'
import { VacuumSheet } from '#/components/entities/VacuumSheet'
import { Drawer, DrawerContent } from '#/components/ui/drawer'
import { notify } from '#/components/ui/toast'
import { entities } from '#/config/dashboard'
import { cn } from '#/lib/cn'
import { AnimatePresence, m, snappy, soft } from '#/lib/motion'

export function QuickDeviceRow() {
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
      <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2">
        <m.div
          animate={{
            borderColor: player.isPlaying
              ? 'rgba(94, 207, 142, 0.35)'
              : 'rgba(255, 255, 255, 0.08)',
            backgroundColor: player.isPlaying ? 'rgba(94, 207, 142, 0.05)' : 'rgba(28, 34, 44, 1)',
          }}
          transition={soft}
          className="min-w-0 rounded-2xl border"
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
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={snappy}
                  whileTap={{ scale: 0.92 }}
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
        </m.div>

        <m.button
          type="button"
          whileTap={{ scale: 0.985 }}
          transition={snappy}
          disabled={vacuum.isUnavailable}
          onClick={() => setVacuumOpen(true)}
          animate={{
            borderColor: vacuum.isCleaning
              ? 'rgba(96, 165, 250, 0.35)'
              : 'rgba(255, 255, 255, 0.08)',
            backgroundColor: vacuum.isCleaning ? 'rgba(96, 165, 250, 0.05)' : 'rgba(28, 34, 44, 1)',
          }}
          className="flex min-h-14 min-w-0 items-center gap-3 rounded-2xl border p-3.5 text-left disabled:opacity-40"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-info/15 text-info">
            <RobotVacuum className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Vacuum</p>
            <AnimatePresence mode="popLayout" initial={false}>
              <m.p
                key={vacuumLabel}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={soft}
                className="truncate text-xs capitalize text-ink-muted"
              >
                {vacuumLabel}
              </m.p>
            </AnimatePresence>
          </div>
          <ChevronRight className="size-5 shrink-0 text-ink-faint" />
        </m.button>
      </div>

      <Drawer open={vacuumOpen} onOpenChange={setVacuumOpen}>
        <DrawerContent title="Vacuum">
          <VacuumSheet entityId={entities.vacuum} />
        </DrawerContent>
      </Drawer>
    </>
  )
}
