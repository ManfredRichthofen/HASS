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
import { useEffect, useState } from 'react'
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

/** Re-renders once a minute so the greeting and date follow the clock. */
function useMinuteClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

const isGone = (state: unknown) => state === 'unavailable' || state === 'unknown'

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

  const now = useMinuteClock()
  const firstName = user?.name?.split(' ')[0]
  const reporting = lights.filter((l) => !isGone(l.state))
  const lightsOn = reporting.filter((l) => l.state === 'on').length
  const lightsOffline = lights.length - reporting.length
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

  const changeLock = () => {
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

  const people = occupancy.isUnavailable ? null : someoneHome ? "someone's home" : 'nobody is home'
  const modeName = String(mode.state ?? '').toLowerCase()
  // Away with someone in the house, or Home with nobody in it: say so plainly.
  const modeNote =
    occupancy.isUnavailable || mode.isUnavailable
      ? null
      : someoneHome && modeName === 'away'
        ? 'House mode is Away, but someone’s home.'
        : !someoneHome && modeName === 'home'
          ? 'House mode is Home, but nobody’s home.'
          : null

  const lightsText =
    reporting.length === 0
      ? 'no lights are reporting'
      : lightsOn > 0
        ? `${lightsOn} light${lightsOn === 1 ? ' is' : 's are'} on`
        : lightsOffline > 0
          ? 'every light that’s reporting is off'
          : 'every light is off'
  // After "Good morning." the next clause starts a sentence if nothing precedes it.
  const lightsLabel = people ? lightsText : lightsText.charAt(0).toUpperCase() + lightsText.slice(1)

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
                className="inline-flex min-h-11 items-center gap-1.5 text-[0.8125rem] text-ink-muted capitalize @xl:min-h-11"
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
          aria-live="polite"
          className={cn(
            'text-display text-[2.125rem] leading-[1.1] text-balance text-ink',
            'walnut:text-[2.25rem] walnut:font-light',
            '@xl:max-w-[26ch] @xl:text-[1.75rem] @xl:leading-[1.15] @xl:text-pretty',
            'walnut:@xl:text-[1.875rem]',
          )}
        >
          {greetingFor(now.getHours())}
          {firstName ? `, ${firstName}` : ''}.{' '}
          {people ? `${people.charAt(0).toUpperCase()}${people.slice(1)}, ` : ''}
          <Link
            to="/rooms"
            className={cn(
              phrase,
              lightsOn > 0 && 'text-light decoration-current modern:bg-light-soft modern:text-ink',
            )}
          >
            {lightsLabel}
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
        {modeNote ? <p className="-mt-1 text-sm text-ink-muted">{modeNote}</p> : null}

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
              onClick={() => (locked ? setConfirmLockOpen(true) : changeLock())}
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
          title="Unlock front door?"
          description="Anyone at the door will be able to open it."
          actions={
            <>
              <DialogClose className="press inline-flex h-11 items-center rounded-pill px-4 text-sm font-semibold text-ink-muted hover:bg-surface-hover hover:text-ink">
                Cancel
              </DialogClose>
              <Button size="sm" variant="danger" onClick={changeLock}>
                Unlock
              </Button>
            </>
          }
        />
      </Dialog>
    </>
  )
}
