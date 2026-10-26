import { useSensor } from 'hass-react'
import type { ReactNode } from 'react'
import { cn } from '#/lib/cn'

/** Sensor values as a quiet strip of numbers separated by rules — no boxes. */
export function Readings({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap gap-y-3 glass:gap-2', className)}>{children}</div>
}

export function Reading({
  value,
  unit,
  label,
  muted,
}: {
  value: ReactNode
  unit?: string
  label: string
  muted?: boolean
}) {
  return (
    <div
      className={cn(
        'min-w-22 flex-1 border-l border-border-subtle px-4 first:border-l-0 first:pl-0',
        'glass:min-w-0 glass:flex-none glass:rounded-pill glass:border-l-0 glass:bg-surface-hover glass:px-4 glass:py-2 glass:shadow-card glass:first:pl-4',
        muted && 'opacity-45',
      )}
    >
      <span className="text-display block text-2xl leading-tight text-ink tabular-nums">
        {value}
        {unit ? (
          <span className="ml-0.5 font-sans text-sm font-normal tracking-normal normal-case text-ink-muted">
            {unit}
          </span>
        ) : null}
      </span>
      <span className="text-label block">{label}</span>
    </div>
  )
}

/** A Reading bound to a sensor entity. Integers stay integers; others round to one decimal. */
export function SensorReading({
  entityId,
  label,
  unit,
}: {
  entityId: string
  label: string
  unit?: string
}) {
  const sensor = useSensor(entityId)
  const raw = sensor.numericValue
  const value = sensor.isUnavailable
    ? '—'
    : raw != null
      ? Number.isInteger(raw)
        ? raw
        : Math.round(raw * 10) / 10
      : (sensor.value ?? sensor.state)
  return (
    <Reading
      value={value}
      unit={sensor.isUnavailable ? undefined : (unit ?? sensor.unitOfMeasurement ?? undefined)}
      label={label}
      muted={sensor.isUnavailable}
    />
  )
}
