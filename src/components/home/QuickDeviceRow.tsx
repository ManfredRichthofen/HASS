import { Link } from '@tanstack/react-router'
import { useSensor, useVacuum } from 'hass-react'
import { ChevronRight, Music2, Pause, Play, RobotVacuum, Thermometer } from 'lucide-react'
import { useState } from 'react'
import { DeviceList, DeviceRow, RowChevron } from '#/components/entities/DeviceRow'
import { VacuumSheet } from '#/components/entities/VacuumSheet'
import { Drawer, DrawerContent } from '#/components/ui/drawer'
import { notify } from '#/components/ui/toast'
import { entities } from '#/config/dashboard'
import { useActiveMedia } from '#/hooks/useActiveMedia'
import { useOptimisticValue } from '#/hooks/useOptimisticValue'
import { cn } from '#/lib/cn'
import { AnimatePresence, m, swapIcon, swapText, tap } from '#/lib/motion'

function Swap({ text }: { text: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <m.span
        key={text}
        initial={swapText.initial}
        animate={swapText.animate}
        exit={swapText.exit}
        transition={swapText.transition}
        className="block truncate"
      >
        {text}
      </m.span>
    </AnimatePresence>
  )
}

/** Stretches the row's name link/button over the whole row so any tap opens it. */
const rowTarget =
  'outline-none after:absolute after:inset-0 after:rounded-control focus-visible:after:ring-2 focus-visible:after:ring-accent'

const chevron = (
  <RowChevron>
    <ChevronRight className="size-[18px]" aria-hidden />
  </RowChevron>
)

/** Home's "Around the house": music, climate and the vacuum in one calm list. */
export function QuickDeviceRow({ className }: { className?: string }) {
  const media = useActiveMedia()
  const vacuum = useVacuum(entities.vacuum)
  const inside = useSensor(entities.livingTemp)
  const [vacuumOpen, setVacuumOpen] = useState(false)
  const { value: isPlaying, commit } = useOptimisticValue(media.isPlaying)

  const isActive = media.isActive
  const musicCaption = isActive
    ? [media.mediaTitle, media.mediaArtist, media.room].filter(Boolean).join(' · ') || 'Playing'
    : 'Nothing playing'

  const vacuumStatus = vacuum.isUnavailable
    ? 'Unavailable'
    : vacuum.isDocked
      ? 'Docked'
      : vacuum.isCleaning
        ? 'Cleaning'
        : vacuum.isReturning
          ? 'Returning'
          : String(vacuum.status ?? vacuum.state)
  const vacuumCaption =
    vacuum.batteryLevel != null && !vacuum.isUnavailable
      ? `${vacuumStatus} · ${vacuum.batteryLevel}%`
      : vacuumStatus

  const handleOpenVacuum = () => setVacuumOpen(true)

  const togglePlayback = () => {
    const next = !isPlaying
    commit(next, async () => {
      try {
        if (isPlaying) await media.player.pause()
        else await media.player.play()
      } catch (err) {
        notify('Music failed', err instanceof Error ? err.message : 'Error')
        throw err
      }
    })
  }

  return (
    <>
      <DeviceList className={className}>
        <DeviceRow
          icon={Music2}
          tone="success"
          name={
            <Link to="/media" aria-label="Open music" className={rowTarget}>
              Music
            </Link>
          }
          caption={<Swap text={musicCaption} />}
          trailing={
            isActive ? (
              <AnimatePresence mode="wait" initial={false}>
                <m.button
                  key={isPlaying ? 'pause' : 'play'}
                  type="button"
                  initial={swapIcon.initial}
                  animate={swapIcon.animate}
                  exit={swapIcon.exit}
                  transition={swapIcon.transition}
                  whileTap={tap.hard}
                  onClick={togglePlayback}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="relative z-10 mr-1.5 grid size-11 shrink-0 place-items-center rounded-pill bg-accent text-on-accent"
                >
                  {isPlaying ? (
                    <Pause className="size-4" fill="currentColor" />
                  ) : (
                    <Play className="size-4" fill="currentColor" />
                  )}
                </m.button>
              </AnimatePresence>
            ) : (
              chevron
            )
          }
        />
        <DeviceRow
          icon={Thermometer}
          tone="light"
          name={
            <Link to="/climate" aria-label="Open climate" className={rowTarget}>
              Climate
            </Link>
          }
          caption={
            inside.numericValue != null
              ? `${Math.round(inside.numericValue)}° in the living room`
              : '—'
          }
          trailing={chevron}
        />
        <DeviceRow
          icon={RobotVacuum}
          tone="info"
          unavailable={vacuum.isUnavailable}
          name={
            <button
              type="button"
              disabled={vacuum.isUnavailable}
              aria-label="Open vacuum"
              onClick={handleOpenVacuum}
              className={cn(rowTarget, 'text-left disabled:cursor-not-allowed')}
            >
              Vacuum
            </button>
          }
          caption={<Swap text={vacuumCaption} />}
          trailing={chevron}
        />
      </DeviceList>

      <Drawer open={vacuumOpen} onOpenChange={setVacuumOpen}>
        <DrawerContent title="Vacuum" description={vacuumCaption}>
          <VacuumSheet entityId={entities.vacuum} />
        </DrawerContent>
      </Drawer>
    </>
  )
}
