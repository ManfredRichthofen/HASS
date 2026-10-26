import { Link } from '@tanstack/react-router'
import {
  useBinarySensor,
  useCurrentUser,
  useEntity,
  useEntityGroup,
  useLock,
  useSensor,
  useWeather,
} from 'hass-react'
import {
  ChevronDown,
  Cloud,
  CloudMoon,
  CloudRain,
  CloudSun,
  Lock,
  LockOpen,
  Moon,
  Settings,
  Sun,
} from 'lucide-react'
import { useState } from 'react'
import { HouseModeGrid } from '#/components/home/HouseModeGrid'
import { Button } from '#/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '#/components/ui/dialog'
import { Drawer, DrawerContent } from '#/components/ui/drawer'
import { notify } from '#/components/ui/toast'
import { entities, isRoomLight } from '#/config/dashboard'
import { useOptimisticValue } from '#/hooks/useOptimisticValue'
import { cn } from '#/lib/cn'

const watchedLights = (entities.allLightsOff as readonly string[]).filter(isRoomLight)

function weatherIcon(condition: string) {
  const c = condition.toLowerCase()
  if (c.includes('rain') || c.includes('pour') || c.includes('snow')) return CloudRain
  if (c.includes('clear-night')) return Moon
  if (c.includes('night')) return CloudMoon
  if (c.includes('sun') || c.includes('clear')) return Sun
  if (c.includes('partly') || c.includes('cloud')) return CloudSun
  return Cloud
}

function greetingFor(hour: number) {
  return hour < 5
    ? 'Good night'
    : hour < 12
      ? 'Good morning'
      : hour < 18
        ? 'Good afternoon'
        : 'Good evening'
}

const phrase = cn(
  'underline decoration-border-strong decoration-1 underline-offset-[0.18em] transition-ui [font:inherit] [letter-spacing:inherit] [text-transform:inherit] hover:decoration-current',
  'modern:rounded-[0.25em] modern:bg-accent-soft modern:px-[0.18em] modern:no-underline',
)

/**
 * The top of Home, written as a sentence: the date and weather, then one line
 * about the house with the parts you can act on underlined, then house mode
 * with a lock control opposite it.
 */
export function HouseSummary() {
  const user = useCurrentUser()
  const weather = useWeather(entities.weather)
  const outdoor = useSensor(entities.outdoorTemp)
  const mode = useEntity(entities.houseMode)
  const auto = useEntity(entities.houseModeAuto)
  const occupancy = useBinarySensor(entities.occupancyAny)
  const lock = useLock(entities.lock)
  const lights = useEntityGroup(watchedLights as string[])
  const [modeOpen, setModeOpen] = useState(false)
  const [confirmLockOpen, setConfirmLockOpen] = useState(false)

  const now = new Date()
  const firstName = user?.name?.split(' ')[0]
  const lightsOn = lights.filter((l) => l.state === 'on').length
  const someoneHome = !occupancy.isUnavailable && occupancy.isOn
  const temp =
    outdoor.numericValue ??
    weather.temperature ??
    (outdoor.value != null ? Number(outdoor.value) : null)
  const condition = String(weather.condition ?? weather.state ?? '')
  const WeatherIcon = weatherIcon(condition)
  const { value: locked, commit: commitLocked } = useOptimisticValue(
    !lock.isUnavailable && lock.isLocked,
  )
  const unlocking = locked

  const handleConfirmLock = () => {
    if (lock.isUnavailable) return
    setConfirmLockOpen(false)
    const nextLocked = !locked
    commitLocked(nextLocked, async () => {
      try {
        if (locked) await lock.unlock()
        else await lock.lock()
        notify(nextLocked ? 'Locked' : 'Unlocked', 'Front door')
      } catch (e) {
        notify('Lock failed', e instanceof Error ? e.message : 'Error')
        throw e
      }
    })
  }

  const people = occupancy.isUnavailable ? null : someoneHome ? "Someone's home" : 'Nobody is home'

  return (
    <>
      <div className="grid gap-4 pt-[max(0.5rem,env(safe-area-inset-top))] @xl:gap-2.5 @xl:pt-0">
        <div className="flex items-center justify-between gap-3">
          <span className="text-label">
            {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <div className="flex items-center gap-1">
            {!weather.isUnavailable ? (
              <Link
                to="/climate"
                className="inline-flex min-h-11 items-center gap-1.5 text-[0.8125rem] text-ink-muted capitalize @xl:min-h-9"
              >
                <WeatherIcon className="size-[18px]" />
                {temp != null && !Number.isNaN(temp) ? `${Math.round(temp)}° ` : ''}
                {condition.replace(/-/g, ' ')}
              </Link>
            ) : null}
            <Link
              to="/settings"
              aria-label="Settings"
              className="-mr-2 grid size-11 place-items-center rounded-pill text-ink-faint hover:text-ink md:hidden"
            >
              <Settings className="size-5" />
            </Link>
          </div>
        </div>

        <p
          className={cn(
            'text-display text-[2.125rem] leading-[1.1] text-balance text-ink',
            'walnut:text-[2.25rem] walnut:font-light',
            '@xl:max-w-[26ch] @xl:text-[1.75rem] @xl:leading-[1.15] @xl:text-pretty',
            'walnut:@xl:text-[1.875rem]',
          )}
        >
          {greetingFor(now.getHours())}
          {firstName ? `, ${firstName}` : ''}. {people ? `${people}, ` : ''}
          <Link
            to="/rooms"
            className={cn(
              phrase,
              lightsOn > 0 && 'text-light decoration-current modern:bg-light-soft modern:text-ink',
            )}
          >
            {lightsOn === 0
              ? 'every light is off'
              : `${lightsOn} light${lightsOn === 1 ? ' is' : 's are'} on`}
          </Link>
          {lock.isUnavailable ? (
            '.'
          ) : (
            <>
              {' '}
              and the front door is{' '}
              <span className={cn(!locked && 'text-danger')}>{locked ? 'locked' : 'unlocked'}</span>
              .
            </>
          )}
        </p>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-expanded={modeOpen}
            aria-haspopup="dialog"
            aria-label={`House mode ${String(mode.state ?? 'unknown')}, ${auto.state === 'on' ? 'Auto' : 'Manual'}. Change mode`}
            onClick={() => setModeOpen(true)}
            className={cn(
              'press inline-flex min-h-11 items-center gap-2 justify-self-start rounded-pill border-ui border-border pr-4 pl-3 text-sm font-semibold text-ink',
              'modern:border-transparent modern:bg-surface',
            )}
          >
            <span
              className={cn(
                'size-2 rounded-pill',
                auto.state === 'on' ? 'bg-success' : 'bg-border-strong',
              )}
            />
            {String(mode.state ?? '—')} · {auto.state === 'on' ? 'Auto' : 'Manual'}
            <ChevronDown className="size-4 text-ink-muted" />
          </button>

          {!lock.isUnavailable ? (
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={locked ? 'Unlock front door' : 'Lock front door'}
              onClick={() => setConfirmLockOpen(true)}
              className={cn(
                'press grid size-11 shrink-0 place-items-center rounded-pill border-ui border-border outline-none',
                'focus-visible:ring-2 focus-visible:ring-accent',
                'modern:border-transparent modern:bg-surface',
                locked ? 'text-success' : 'text-danger',
              )}
            >
              {locked ? <Lock className="size-5" /> : <LockOpen className="size-5" />}
            </button>
          ) : null}
        </div>
      </div>

      <Drawer open={modeOpen} onOpenChange={setModeOpen}>
        <DrawerContent
          title="House mode"
          description={auto.state === 'on' ? 'Switching automatically' : 'Set by hand'}
        >
          <HouseModeGrid onPicked={() => setModeOpen(false)} />
        </DrawerContent>
      </Drawer>

      <Dialog open={confirmLockOpen} onOpenChange={setConfirmLockOpen}>
        <DialogContent
          title={unlocking ? 'Unlock front door?' : 'Lock front door?'}
          description={
            unlocking
              ? 'Anyone at the door will be able to open it.'
              : 'The front door will lock until you unlock it again.'
          }
          actions={
            <>
              <DialogClose className="press inline-flex h-11 items-center rounded-pill px-4 text-sm font-semibold text-ink-muted hover:bg-surface-hover hover:text-ink">
                Cancel
              </DialogClose>
              <Button
                size="sm"
                variant={unlocking ? 'danger' : 'primary'}
                onClick={handleConfirmLock}
              >
                {unlocking ? 'Unlock' : 'Lock'}
              </Button>
            </>
          }
        />
      </Dialog>
    </>
  )
}
