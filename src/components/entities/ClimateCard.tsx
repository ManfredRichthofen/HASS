import { useClimate } from 'hass-react'
import { Minus, Plus, Thermometer } from 'lucide-react'
import { type PointerEvent, useEffect, useRef, useState } from 'react'
import { Button } from '#/components/ui/button'
import { Segmented } from '#/components/ui/segmented'
import { notify } from '#/components/ui/toast'
import { useOptimisticValue } from '#/hooks/useOptimisticValue'
import { cn } from '#/lib/cn'
import { entityName } from '#/lib/entityName'

const allModes = ['off', 'heat', 'cool', 'heat_cool', 'auto', 'fan_only'] as const
const modeLabel: Record<string, string> = {
  off: 'Off',
  heat: 'Heat',
  cool: 'Cool',
  heat_cool: 'Heat/cool',
  auto: 'Auto',
  fan_only: 'Fan',
  dry: 'Dry',
}

// Geometry: a 270° arc opening at the bottom.
const CX = 124
const CY = 118
const R = 96
const A0 = 135
const A1 = 405

function point(angle: number, radius = R) {
  const rad = (angle * Math.PI) / 180
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) }
}

function arcPath(from: number, to: number) {
  const a = point(from)
  const b = point(to)
  const large = to - from > 180 ? 1 : 0
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} A${R} ${R} 0 ${large} 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

/**
 * The thermostat as a dial you can read across the room: a 270° arc filled to
 * the target, the target huge in the middle, a tick where the room actually is.
 * Drag the arc, or use − / +. `compact` renders a single row for lists.
 */
export function ClimateCard({
  entityId,
  compact = false,
}: {
  entityId: string
  compact?: boolean
}) {
  const climate = useClimate(entityId)
  const name = entityName(entityId, climate.attributes.friendly_name)
  const unavailable = climate.isUnavailable
  const lo = climate.minTemp ?? 50
  const hi = climate.maxTemp ?? 90
  const haTarget = climate.targetTemperature ?? lo
  const [target, setTarget] = useState(haTarget)
  const dragging = useRef(false)
  const current = climate.currentTemperature
  const { value: mode, commit: commitMode } = useOptimisticValue(String(climate.mode ?? 'off'))
  const action = String((climate.attributes as { hvac_action?: string }).hvac_action ?? '')

  useEffect(() => {
    if (!dragging.current) setTarget(haTarget)
  }, [haTarget])

  async function commit(next: number) {
    const value = clamp(Math.round(next), lo, hi)
    setTarget(value)
    try {
      await climate.setTemperature(value)
    } catch (e) {
      notify('Temperature failed', e instanceof Error ? e.message : 'Error')
    }
  }

  const setMode = (next: string) => {
    commitMode(next, async () => {
      try {
        await climate.setMode(next)
      } catch (e) {
        notify('Mode failed', e instanceof Error ? e.message : 'Error')
        throw e
      }
    })
  }

  const supported = (climate.supportedModes.length ? climate.supportedModes : [...allModes]).map(
    (m) => ({ value: m, label: modeLabel[m] ?? m.replace('_', ' ') }),
  )
  const statusLine = unavailable
    ? 'Unavailable'
    : [
        action && action !== 'idle' && action !== 'off'
          ? action.charAt(0).toUpperCase() + action.slice(1)
          : mode === 'off'
            ? 'Off'
            : 'Idle',
        current != null ? `${Math.round(current)}° inside` : null,
      ]
        .filter(Boolean)
        .join(' · ')

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-4 rounded-card border-ui border-border-subtle bg-surface p-4.5 shadow-card modern:border-transparent',
          unavailable && 'opacity-45',
        )}
      >
        <div className="flex min-w-0 items-center gap-4">
          <span className="text-light">
            <Thermometer className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.9375rem] font-semibold text-ink">{name}</p>
            <p className="truncate text-[0.8125rem] text-ink-muted">{statusLine}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-display text-3xl leading-none text-ink tabular-nums">
            {Math.round(target)}°
          </p>
          <p className="text-label mt-1">Target</p>
        </div>
      </div>
    )
  }

  const span = hi - lo || 1
  const angleFor = (v: number) => A0 + ((clamp(v, lo, hi) - lo) / span) * (A1 - A0)
  const at = angleFor(target)
  const knob = point(at)
  const tick = current != null ? angleFor(current) : null
  const heatLike = mode === 'heat' || mode === 'heat_cool' || mode === 'auto'
  const arcColor =
    mode === 'cool'
      ? 'stroke-info'
      : heatLike
        ? 'stroke-on-to brutal:stroke-ink'
        : 'stroke-ink-faint'

  function valueFromPointer(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 248 - CX
    const y = ((e.clientY - rect.top) / rect.height) * 220 - CY
    let angle = (Math.atan2(y, x) * 180) / Math.PI
    if (angle < 90) angle += 360 // map into 135…405
    angle = clamp(angle, A0, A1)
    return lo + ((angle - A0) / (A1 - A0)) * span
  }

  return (
    <div
      className={cn(
        'grid h-full justify-items-center gap-4 rounded-card border-ui border-border-subtle bg-surface px-4 pt-5 pb-4 shadow-card',
        '@md:gap-5 @md:px-5 @md:pt-6 @md:pb-5',
        'modern:border-transparent brutal:border-ink',
        unavailable && 'opacity-45',
      )}
    >
      <div className="flex w-full items-baseline justify-between gap-3">
        <h3 className="text-display truncate text-xl text-ink">{name}</h3>
        <span className="shrink-0 text-[0.8125rem] text-ink-muted brutal:font-label brutal:text-xs">
          {statusLine}
        </span>
      </div>

      <div className="relative h-[220px] w-[248px]">
        <svg
          viewBox="0 0 248 220"
          className={cn(
            'absolute inset-0 overflow-visible',
            !unavailable && 'cursor-grab touch-none',
          )}
          // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the dial arc itself is the slider
          role="slider"
          aria-label={`${name} target temperature`}
          aria-valuemin={lo}
          aria-valuemax={hi}
          aria-valuenow={Math.round(target)}
          tabIndex={unavailable ? -1 : 0}
          onKeyDown={(e) => {
            if (unavailable) return
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
              e.preventDefault()
              void commit(target + 1)
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
              e.preventDefault()
              void commit(target - 1)
            }
          }}
          onPointerDown={(e) => {
            if (unavailable) return
            dragging.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            setTarget(Math.round(valueFromPointer(e)))
          }}
          onPointerMove={(e) => {
            if (!dragging.current) return
            setTarget(Math.round(valueFromPointer(e)))
          }}
          onPointerUp={() => {
            if (!dragging.current) return
            dragging.current = false
            void commit(target)
          }}
        >
          <path
            d={arcPath(A0, A1)}
            className="fill-none stroke-surface-hover brutal:[stroke-linecap:butt]"
            strokeWidth={14}
            strokeLinecap="round"
          />
          <path
            d={arcPath(A0, Math.max(A0 + 0.5, at))}
            className={cn(
              'fill-none modern:[stroke-width:8] brutal:[stroke-linecap:butt]',
              arcColor,
            )}
            strokeWidth={14}
            strokeLinecap="round"
          />
          {tick != null ? (
            <line
              x1={point(tick, R - 22).x}
              y1={point(tick, R - 22).y}
              x2={point(tick, R - 12).x}
              y2={point(tick, R - 12).y}
              className="stroke-ink-faint"
              strokeWidth={2}
              strokeLinecap="round"
            />
          ) : null}
          <circle
            cx={knob.x}
            cy={knob.y}
            r={12}
            className="fill-ink stroke-surface modern:fill-surface modern:stroke-ink brutal:fill-on-from brutal:stroke-ink"
            strokeWidth={4}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-content-center pt-2 text-center">
          <span className="text-label">
            {mode === 'off' ? 'Off' : `${modeLabel[mode] ?? mode} to`}
          </span>
          <span className="text-[4rem] leading-none text-ink tabular-nums [font-family:var(--ui-display)] walnut:font-light modern:font-medium modern:tracking-[-0.05em] brutal:text-[4.5rem] brutal:font-bold brutal:tracking-[-0.06em]">
            {Math.round(target)}°
          </span>
        </div>
      </div>

      <div className="flex w-full max-w-[19rem] items-center justify-between">
        <Button
          size="icon"
          variant="secondary"
          aria-label="Cooler"
          disabled={unavailable || target <= lo}
          onClick={() => void commit(target - 1)}
        >
          <Minus className="size-5" aria-hidden />
        </Button>
        <span className="text-[0.8125rem] text-ink-faint tabular-nums brutal:font-label brutal:text-xs">
          {Math.round(lo)}° – {Math.round(hi)}°
        </span>
        <Button
          size="icon"
          variant="secondary"
          aria-label="Warmer"
          disabled={unavailable || target >= hi}
          onClick={() => void commit(target + 1)}
        >
          <Plus className="size-5" aria-hidden />
        </Button>
      </div>

      <Segmented
        className="w-full"
        label="Mode"
        options={supported}
        value={mode}
        disabled={unavailable}
        onChange={setMode}
      />
    </div>
  )
}

export const ClimateDial = ClimateCard
