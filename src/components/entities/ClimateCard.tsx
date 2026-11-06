import { useClimate } from 'hass-react'
import { Minus, Plus } from 'lucide-react'
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

/** One setpoint of a heat/cool range: a big number with − and + beside it. */
function RangeStepper({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  disabled?: boolean
  onChange: (next: number) => void
}) {
  return (
    <div className="grid min-w-0 justify-items-center gap-2 rounded-control bg-canvas px-3 py-4">
      <span className="text-label">{label}</span>
      <span className="text-[3rem] leading-none text-ink tabular-nums [font-family:var(--ui-display)] walnut:font-light modern:font-medium modern:tracking-[-0.05em]">
        {Math.round(value)}°
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="secondary"
          aria-label={`Lower ${label.toLowerCase()}`}
          disabled={disabled || value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Minus className="size-5" aria-hidden />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          aria-label={`Raise ${label.toLowerCase()}`}
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus className="size-5" aria-hidden />
        </Button>
      </div>
    </div>
  )
}

/** Keep the two setpoints at least this far apart so heat and cool never fight. */
const RANGE_GAP = 2

/**
 * The thermostat as a dial you can read across the room: a 270° arc filled to
 * the target, the target huge in the middle, a tick where the room actually is.
 * Drag the arc, or use − / +. In heat/cool it shows the two setpoints instead.
 */
export function ClimateCard({ entityId }: { entityId: string }) {
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

  // Heat/cool reports a low and a high setpoint instead of one target.
  const rangeLow = climate.targetTempLow
  const rangeHigh = climate.targetTempHigh
  const dual = climate.targetTemperature == null && rangeLow != null && rangeHigh != null
  const [range, setRange] = useState({ low: rangeLow ?? lo, high: rangeHigh ?? hi })
  useEffect(() => {
    if (rangeLow != null && rangeHigh != null) setRange({ low: rangeLow, high: rangeHigh })
  }, [rangeLow, rangeHigh])

  // Show every tap at once, but send one command once the taps stop.
  const sendTimer = useRef<number | undefined>(undefined)
  const rangeTimer = useRef<number | undefined>(undefined)

  function commit(next: number, delay = 450) {
    const value = clamp(Math.round(next), lo, hi)
    setTarget(value)
    window.clearTimeout(sendTimer.current)
    sendTimer.current = window.setTimeout(async () => {
      try {
        await climate.setTemperature(value)
      } catch (e) {
        setTarget(haTarget)
        notify('Temperature didn’t change', e instanceof Error ? e.message : 'Error')
      }
    }, delay)
  }

  function commitRange(next: { low: number; high: number }) {
    setRange(next)
    window.clearTimeout(rangeTimer.current)
    rangeTimer.current = window.setTimeout(async () => {
      try {
        await climate.setTemperatureRange(next.low, next.high)
      } catch (e) {
        setRange({ low: rangeLow ?? lo, high: rangeHigh ?? hi })
        notify('Temperature range didn’t change', e instanceof Error ? e.message : 'Error')
      }
    }, 450)
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

  const span = hi - lo || 1
  const angleFor = (v: number) => A0 + ((clamp(v, lo, hi) - lo) / span) * (A1 - A0)
  const at = angleFor(target)
  const knob = point(at)
  const tick = current != null ? angleFor(current) : null
  const heatLike = mode === 'heat' || mode === 'heat_cool' || mode === 'auto'
  const arcColor = mode === 'cool' ? 'stroke-info' : heatLike ? 'stroke-on-to' : 'stroke-ink-faint'

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
        'grid h-full justify-items-center gap-3 rounded-card border-ui border-border-subtle bg-surface px-3.5 pt-4 pb-3.5 shadow-card',
        '@md:gap-4 @md:px-5 @md:pt-5 @md:pb-4',
        'modern:border-transparent',
        unavailable && 'opacity-45',
      )}
    >
      <div className="flex w-full items-baseline justify-between gap-3">
        <h3 className="text-display truncate text-xl text-ink">{name}</h3>
        <span className="shrink-0 text-[0.8125rem] text-ink-muted">{statusLine}</span>
      </div>

      {dual ? (
        <div className="grid w-full grid-cols-2 gap-3">
          <RangeStepper
            label="Heat to"
            value={range.low}
            min={lo}
            max={range.high - RANGE_GAP}
            disabled={unavailable}
            onChange={(low) => commitRange({ low, high: range.high })}
          />
          <RangeStepper
            label="Cool to"
            value={range.high}
            min={range.low + RANGE_GAP}
            max={hi}
            disabled={unavailable}
            onChange={(high) => commitRange({ low: range.low, high })}
          />
        </div>
      ) : (
        <>
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
          aria-valuetext={`${Math.round(target)}° target${current != null ? `, ${Math.round(current)}° inside` : ''}`}
          tabIndex={unavailable ? -1 : 0}
          onKeyDown={(e) => {
            if (unavailable) return
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
              e.preventDefault()
              commit(target + 1)
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
              e.preventDefault()
              commit(target - 1)
            }
          }}
          onPointerDown={(e) => {
            if (unavailable) return
            // Only the ring is a handle, not the empty box around it or the number inside.
            const box = e.currentTarget.getBoundingClientRect()
            const dx = ((e.clientX - box.left) / box.width) * 248 - CX
            const dy = ((e.clientY - box.top) / box.height) * 220 - CY
            const dist = Math.hypot(dx, dy)
            if (dist < R - 26 || dist > R + 26) return
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
            commit(target, 0)
          }}
          // An interrupted gesture (scroll takeover, alert) must not leave the dial stuck.
          onPointerCancel={() => {
            if (!dragging.current) return
            dragging.current = false
            setTarget(haTarget)
          }}
        >
          <path
            d={arcPath(A0, A1)}
            className="fill-none stroke-surface-hover"
            strokeWidth={14}
            strokeLinecap="round"
          />
          <path
            d={arcPath(A0, Math.max(A0 + 0.5, at))}
            className={cn('fill-none modern:[stroke-width:8]', arcColor)}
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
            className="fill-ink stroke-surface modern:fill-surface modern:stroke-ink"
            strokeWidth={4}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-content-center pt-2 text-center">
          <span className="text-label">
            {mode === 'off' ? 'Off' : `${modeLabel[mode] ?? mode} to`}
          </span>
          <span className="text-[4rem] leading-none text-ink tabular-nums [font-family:var(--ui-display)] walnut:font-light modern:font-medium modern:tracking-[-0.05em]">
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
          onClick={() => commit(target - 1)}
        >
          <Minus className="size-5" aria-hidden />
        </Button>
        <span className="text-[0.8125rem] text-ink-faint tabular-nums">
          {Math.round(lo)}° – {Math.round(hi)}°
        </span>
        <Button
          size="icon"
          variant="secondary"
          aria-label="Warmer"
          disabled={unavailable || target >= hi}
          onClick={() => commit(target + 1)}
        >
          <Plus className="size-5" aria-hidden />
        </Button>
      </div>
        </>
      )}

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
