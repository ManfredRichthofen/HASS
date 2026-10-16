import { useClimate, useFan } from 'hass-react'
import { Fan, Minus, Plus, Thermometer } from 'lucide-react'
import { entityName } from '#/lib/entityName'
import { cn } from '#/lib/cn'
import { Button } from '#/components/ui/button'
import { Slider } from '#/components/ui/slider'
import { Switch } from '#/components/ui/switch'
import { Toggle } from '#/components/ui/toggle'
import { notify } from '#/components/ui/toast'

const modes = ['off', 'heat', 'cool', 'heat_cool', 'auto', 'fan_only'] as const

function ThermostatFanRow({ fanId }: { fanId: string }) {
  const fan = useFan(fanId)
  if (fan.isUnavailable) return null

  const speed = Math.round(fan.percentage) || 0

  return (
    <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-canvas/40 px-3.5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
          <Fan className={cn('size-4', fan.isOn && 'animate-spin')} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Fan</p>
          <p className="text-xs text-ink-muted">
            {fan.isOn ? (speed ? `${speed}%` : 'On') : 'Off'}
          </p>
        </div>
      </div>
      <Switch
        checked={fan.isOn}
        onCheckedChange={() => {
          void fan.toggle().catch((e) =>
            notify('Fan failed', e instanceof Error ? e.message : 'Error'),
          )
        }}
      />
    </div>
  )
}

export function ClimateCard({
  entityId,
  fanId,
  compact = false,
}: {
  entityId: string
  /** Same-device thermostat fan entity, shown on this card. */
  fanId?: string
  compact?: boolean
}) {
  const climate = useClimate(entityId)
  const name = entityName(entityId, climate.attributes.friendly_name)
  const unavailable = climate.isUnavailable
  const target = climate.targetTemperature ?? climate.minTemp
  const current = climate.currentTemperature

  async function setTemp(next: number) {
    try {
      await climate.setTemperature(next)
    } catch (e) {
      notify('Temp failed', e instanceof Error ? e.message : 'Error')
    }
  }

  async function setMode(mode: string) {
    try {
      await climate.setMode(mode)
    } catch (e) {
      notify('Mode failed', e instanceof Error ? e.message : 'Error')
    }
  }

  const supported = climate.supportedModes.length
    ? climate.supportedModes
    : [...modes]

  if (compact) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-border-subtle bg-surface p-4',
          unavailable && 'opacity-40',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
              <Thermometer className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{name}</p>
              <p className="text-xs capitalize text-ink-muted">{climate.mode}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-semibold tabular-nums text-ink">
              {current != null ? `${Math.round(current)}°` : '—'}
            </p>
            <p className="text-xs text-ink-muted tabular-nums">
              Target {target != null ? `${Math.round(target)}°` : '—'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-border-subtle bg-surface p-4 sm:p-5',
        unavailable && 'opacity-40',
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <p className="text-sm text-ink-muted">Climate</p>
          <h3 className="mt-0.5 truncate font-display text-lg font-semibold text-ink sm:text-xl">
            {name}
          </h3>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <Thermometer className="size-5" />
        </span>
      </div>

      <div className="mb-5 flex items-end justify-center gap-4 sm:mb-6 sm:gap-6">
        <div className="text-center">
          <p className="text-xs text-ink-muted">Inside</p>
          <p className="font-display text-4xl font-semibold tabular-nums tracking-tight text-ink sm:text-5xl">
            {current != null ? Math.round(current) : '—'}
            <span className="text-xl text-ink-muted sm:text-2xl">°</span>
          </p>
        </div>
        <div className="mb-2 h-10 w-px bg-border sm:h-12" />
        <div className="text-center">
          <p className="text-xs text-ink-muted">Target</p>
          <p className="font-display text-3xl font-semibold tabular-nums text-accent sm:text-4xl">
            {target != null ? Math.round(target) : '—'}
            <span className="text-lg sm:text-xl">°</span>
          </p>
        </div>
      </div>

      <div className="mb-5 flex items-center justify-center gap-3">
        <Button
          size="icon"
          variant="secondary"
          disabled={unavailable}
          onClick={() => void setTemp((target ?? 68) - 1)}
        >
          <Minus className="size-5" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          disabled={unavailable}
          onClick={() => void setTemp((target ?? 68) + 1)}
        >
          <Plus className="size-5" />
        </Button>
      </div>

      {climate.supportsTargetTemperature ? (
        <div className="mb-5 space-y-2">
          <Slider
            aria-label="Target temperature"
            min={climate.minTemp}
            max={climate.maxTemp}
            step={1}
            disabled={unavailable}
            value={target ?? climate.minTemp}
            onValueCommitted={(value) => {
              void setTemp(Array.isArray(value) ? value[0] : value)
            }}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {supported.map((mode) => (
          <Toggle
            key={mode}
            pressed={climate.mode === mode}
            disabled={unavailable}
            onPressedChange={() => void setMode(mode)}
            className="touch-target capitalize sm:flex-none"
          >
            {mode.replace('_', ' ')}
          </Toggle>
        ))}
      </div>

      {fanId ? <ThermostatFanRow fanId={fanId} /> : null}
    </div>
  )
}
