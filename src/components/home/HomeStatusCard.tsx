import { Link } from '@tanstack/react-router'
import {
  useBinarySensor,
  useEntity,
  useEntityGroup,
  useLock,
} from 'hass-react'
import {
  Lightbulb,
  Lock,
  LockOpen,
  UserRound,
  UserRoundX,
  type LucideIcon,
} from 'lucide-react'
import { entities, isRoomLight } from '#/config/dashboard'
import { cn } from '#/lib/cn'
import { AnimatePresence, m, soft } from '#/lib/motion'

const watchedLights = (entities.allLightsOff as readonly string[]).filter(
  isRoomLight,
)

export function HomeStatusCard() {
  const mode = useEntity<{ options?: string[] }>(entities.houseMode)
  const auto = useEntity(entities.houseModeAuto)
  const occupancy = useBinarySensor(entities.occupancyAny)
  const lock = useLock(entities.lock)
  // Curated light.* only — avoids a full get_states via useLights().
  const lights = useEntityGroup([...watchedLights])

  const lightsOn = lights.filter((light) => light.state === 'on').length

  const modeLabel = String(mode.state ?? '—')
  const autoOn = auto.state === 'on'
  const someoneHome = !occupancy.isUnavailable && occupancy.isOn
  const locked = lock.isLocked

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface p-3.5 sm:p-4">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink-muted">House mode</p>
          <p className="truncate font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            <AnimatePresence mode="popLayout" initial={false}>
              <m.span
                key={modeLabel}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={soft}
                className="inline-block max-w-full truncate"
              >
                {modeLabel}
              </m.span>
            </AnimatePresence>
          </p>
        </div>
        <span
          className={cn(
            'mb-0.5 shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold',
            autoOn ? 'bg-accent-soft text-accent' : 'bg-canvas text-ink-faint',
          )}
        >
          {autoOn ? 'Auto' : 'Manual'}
        </span>
      </div>

      <div className="mt-3 grid flex-1 grid-cols-3 gap-1.5 sm:mt-4 sm:gap-2">
        <StatusCell
          label="Home"
          value={occupancy.isUnavailable ? '—' : someoneHome ? 'Yes' : 'Empty'}
          tone={someoneHome ? 'active' : 'muted'}
          icon={someoneHome ? UserRound : UserRoundX}
        />
        <Link to="/rooms" className="block min-h-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <StatusCell
            label="Lights"
            value={lightsOn === 0 ? 'Off' : `${lightsOn} on`}
            tone={lightsOn > 0 ? 'light' : 'muted'}
            icon={Lightbulb}
            interactive
          />
        </Link>
        <Link to="/security" className="block min-h-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <StatusCell
            label="Door"
            value={lock.isUnavailable ? '—' : locked ? 'Locked' : 'Open'}
            tone={locked ? 'success' : 'danger'}
            icon={locked ? Lock : LockOpen}
            interactive
          />
        </Link>
      </div>
    </div>
  )
}

function StatusCell({
  label,
  value,
  tone,
  icon: Icon,
  interactive = false,
}: {
  label: string
  value: string
  tone: 'active' | 'muted' | 'light' | 'success' | 'danger'
  icon: LucideIcon
  interactive?: boolean
}) {
  const tones = {
    active: 'text-accent bg-accent-soft',
    muted: 'text-ink-muted bg-canvas',
    light: 'text-light bg-light-soft',
    success: 'text-success bg-success/15',
    danger: 'text-danger bg-danger/15',
  }

  return (
    <div
      className={cn(
        'flex h-full min-h-[4.25rem] flex-col rounded-xl bg-canvas/50 px-2 py-2 sm:min-h-[4.5rem] sm:px-2.5 sm:py-2.5',
        interactive && 'transition hover:bg-canvas',
        !interactive && 'opacity-90',
      )}
    >
      <span className={cn('mb-1.5 grid size-8 place-items-center rounded-lg sm:mb-2 sm:size-9', tones[tone])}>
        <Icon className="size-3.5 sm:size-4" />
      </span>
      <p className="truncate text-[10px] font-medium text-ink-faint sm:text-[11px]">{label}</p>
      <AnimatePresence mode="popLayout" initial={false}>
        <m.p
          key={value}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={soft}
          className="mt-0.5 truncate text-xs font-semibold text-ink sm:text-sm"
        >
          {value}
        </m.p>
      </AnimatePresence>
    </div>
  )
}
