import { Link } from '@tanstack/react-router'
import { useMediaPlayer, useSensor, useVacuum } from 'hass-react'
import { ChevronRight, Music2, Pause, Play, RobotVacuum, Thermometer } from 'lucide-react'
import { useState } from 'react'
import { DeviceList, DeviceRow, RowChevron } from '#/components/entities/DeviceRow'
import { VacuumSheet } from '#/components/entities/VacuumSheet'
import { Drawer, DrawerContent } from '#/components/ui/drawer'
import { notify } from '#/components/ui/toast'
import { entities } from '#/config/dashboard'
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

/** Home's "Around the house": music, climate and the vacuum in one calm list. */
export function QuickDeviceRow({ className }: { className?: string }) {
  const player = useMediaPlayer(entities.mediaAll)
  const vacuum = useVacuum(entities.vacuum)
  const inside = useSensor(entities.livingTemp)
  const [vacuumOpen, setVacuumOpen] = useState(false)

  const isActive = player.isPlaying || player.isPaused
  const musicCaption = isActive
    ? [player.mediaTitle, player.mediaArtist].filter(Boolean).join(' · ') || 'Playing'
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

  async function togglePlayback() {
    try {
      if (player.isPlaying) await player.pause()
      else await player.play()
    } catch (err) {
      notify('Music failed', err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <>
      <DeviceList className={className}>
        <DeviceRow
          icon={Music2}
          tone="success"
          name={<Link to="/media">Music</Link>}
          caption={<Swap text={musicCaption} />}
          trailing={
            isActive ? (
              <AnimatePresence mode="wait" initial={false}>
                <m.button
                  key={player.isPlaying ? 'pause' : 'play'}
                  type="button"
                  initial={swapIcon.initial}
                  animate={swapIcon.animate}
                  exit={swapIcon.exit}
                  transition={swapIcon.transition}
                  whileTap={tap.hard}
                  onClick={() => void togglePlayback()}
                  aria-label={player.isPlaying ? 'Pause' : 'Play'}
                  className="mr-1.5 grid size-11 shrink-0 place-items-center rounded-pill bg-accent text-on-accent"
                >
                  {player.isPlaying ? (
                    <Pause className="size-4" fill="currentColor" />
                  ) : (
                    <Play className="size-4" fill="currentColor" />
                  )}
                </m.button>
              </AnimatePresence>
            ) : (
              <Link to="/media" aria-label="Open music">
                <RowChevron>
                  <ChevronRight className="size-[18px]" />
                </RowChevron>
              </Link>
            )
          }
        />
        <DeviceRow
          icon={Thermometer}
          tone="light"
          name={<Link to="/climate">Climate</Link>}
          caption={
            inside.numericValue != null
              ? `${Math.round(inside.numericValue)}° in the living room`
              : '—'
          }
          trailing={
            <Link to="/climate" aria-label="Open climate">
              <RowChevron>
                <ChevronRight className="size-[18px]" />
              </RowChevron>
            </Link>
          }
        />
        <DeviceRow
          icon={RobotVacuum}
          tone="info"
          unavailable={vacuum.isUnavailable}
          name="Vacuum"
          caption={<Swap text={vacuumCaption} />}
          trailing={
            <button
              type="button"
              disabled={vacuum.isUnavailable}
              aria-label="Open vacuum"
              onClick={() => setVacuumOpen(true)}
              className={cn('rounded-pill hover:bg-surface-hover')}
            >
              <RowChevron>
                <ChevronRight className="size-[18px]" />
              </RowChevron>
            </button>
          }
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
