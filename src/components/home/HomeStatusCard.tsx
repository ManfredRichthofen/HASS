import { Link } from '@tanstack/react-router'
import {
  useBinarySensor,
  useEntity,
  useLights,
  useLock,
} from 'hass-react'
import {
  Home,
  Lightbulb,
  Lock,
  LockOpen,
  UserRound,
  UserRoundX,
} from 'lucide-react'
import { entities } from '#/config/dashboard'
import { cn } from '#/lib/cn'

export function HomeStatusCard() {
  const mode = useEntity<{ options?: string[] }>(entities.houseMode)
  const auto = useEntity(entities.houseModeAuto)
  const occupancy = useBinarySensor(entities.occupancyAny)
  const lock = useLock(entities.lock)
  const lights = useLights()

  const watched = new Set(entities.allLightsOff as readonly string[])
  const lightsOn = lights.filter(
    (light) => watched.has(light.entity_id) && light.state === 'on',
  ).length

  const modeLabel = String(mode.state ?? '—')
  const autoOn = auto.state === 'on'
  const someoneHome = !occupancy.isUnavailable && occupancy.isOn
  const locked = lock.isLocked

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border-subtle bg-gradient-to-br from-surface via-canvas-elevated to-surface p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Home className="size-6" />
        </span>
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">
            House mode
          </p>
          <p className="font-display text-2xl font-semibold tracking-tight text-ink">
            {modeLabel}
            <span
              className={cn(
                'ml-2 align-middle text-sm font-medium',
                autoOn ? 'text-accent' : 'text-ink-faint',
              )}
            >
              {autoOn ? 'Auto' : 'Manual'}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatusPill
          label="At home"
          value={occupancy.isUnavailable ? '—' : someoneHome ? 'Yes' : 'Nobody'}
          tone={someoneHome ? 'accent' : 'muted'}
          icon={someoneHome ? UserRound : UserRoundX}
        />
        <StatusPill
          label="Lights"
          value={lightsOn === 0 ? 'All off' : `${lightsOn} on`}
          tone={lightsOn > 0 ? 'accent' : 'muted'}
          icon={Lightbulb}
        />
        <Link to="/security" className="block rounded-2xl">
          <StatusPill
            label="Front door"
            value={lock.isUnavailable ? '—' : locked ? 'Locked' : 'Unlocked'}
            tone={locked ? 'success' : 'danger'}
            icon={locked ? Lock : LockOpen}
          />
        </Link>
      </div>
    </div>
  )
}

function StatusPill({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string
  value: string
  tone: 'accent' | 'muted' | 'success' | 'danger'
  icon: typeof Home
}) {
  const tones = {
    accent: 'text-accent bg-accent-soft',
    muted: 'text-ink-muted bg-canvas',
    success: 'text-success bg-success/15',
    danger: 'text-danger bg-danger/15',
  }

  return (
    <div className="h-full rounded-2xl border border-border-subtle bg-canvas/40 px-2.5 py-2.5">
      <div
        className={cn(
          'mb-2 grid size-8 place-items-center rounded-xl',
          tones[tone],
        )}
      >
        <Icon className="size-4" />
      </div>
      <p className="text-[10px] font-semibold tracking-[0.12em] text-ink-faint uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
    </div>
  )
}
