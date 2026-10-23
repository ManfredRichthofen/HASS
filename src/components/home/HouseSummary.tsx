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
  Moon,
  Settings,
  Sun,
} from 'lucide-react'
import { useState } from 'react'
import { HouseModeGrid } from '#/components/home/HouseModeGrid'
import { Drawer, DrawerContent } from '#/components/ui/drawer'
import { notify } from '#/components/ui/toast'
import { entities, isRoomLight } from '#/config/dashboard'
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
  'brutal:decoration-on-from brutal:decoration-[3px]',
)

/**
 * The top of Home, written as a sentence: the date and weather, then one line
 * about the house with the parts you can act on underlined, then the mode pill.
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

  async function toggleLock() {
    if (lock.isUnavailable) return
    const unlocking = lock.isLocked
    try {
      if (unlocking) await lock.unlock()
      else await lock.lock()
      notify(unlocking ? 'Unlocked' : 'Locked', 'Front door')
    } catch (e) {
      notify('Lock failed', e instanceof Error ? e.message : 'Error')
    }
  }

  const people = occupancy.isUnavailable ? null : someoneHome ? "Someone's home" : 'Nobody is home'

  return (
    <>
      <div className="grid gap-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-label">
            {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <div className="flex items-center gap-1">
            {!weather.isUnavailable ? (
              <Link
                to="/climate"
                className="inline-flex min-h-11 items-center gap-1.5 text-[0.8125rem] text-ink-muted capitalize brutal:font-label brutal:text-xs"
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

        <p className="text-display text-[2.125rem] leading-[1.1] text-balance text-ink walnut:text-[2.25rem] walnut:font-light brutal:text-[2.5rem] brutal:leading-none">
          {greetingFor(now.getHours())}
          {firstName ? `, ${firstName}` : ''}. {people ? `${people}, ` : ''}
          <Link
            to="/rooms"
            className={cn(
              phrase,
              lightsOn > 0 &&
                'text-light decoration-current modern:bg-light-soft modern:text-ink brutal:bg-on-from brutal:px-[0.1em] brutal:text-ink brutal:no-underline',
            )}
          >
            {lightsOn === 0
              ? 'every light is off'
              : `${lightsOn} light${lightsOn === 1 ? ' is' : 's are'} on`}
          </Link>
          {lock.isUnavailable ? '.' : ' and the front door is '}
          {lock.isUnavailable ? null : (
            <>
              <button
                type="button"
                onClick={() => void toggleLock()}
                aria-label={
                  lock.isLocked ? 'Front door locked. Unlock' : 'Front door unlocked. Lock'
                }
                className={cn(
                  phrase,
                  'cursor-pointer',
                  !lock.isLocked && 'text-danger decoration-current',
                )}
              >
                {lock.isLocked ? 'locked' : 'unlocked'}
              </button>
              .
            </>
          )}
        </p>

        <button
          type="button"
          onClick={() => setModeOpen(true)}
          className={cn(
            'press inline-flex min-h-11 items-center gap-2 justify-self-start rounded-pill border-ui border-border pr-4 pl-3 text-sm font-semibold text-ink',
            'modern:border-transparent modern:bg-surface',
            'brutal:bg-surface brutal:font-label brutal:text-xs brutal:uppercase brutal:shadow-press',
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
      </div>

      <Drawer open={modeOpen} onOpenChange={setModeOpen}>
        <DrawerContent
          title="House mode"
          description={auto.state === 'on' ? 'Switching automatically' : 'Set by hand'}
        >
          <HouseModeGrid onPicked={() => setModeOpen(false)} />
        </DrawerContent>
      </Drawer>
    </>
  )
}
