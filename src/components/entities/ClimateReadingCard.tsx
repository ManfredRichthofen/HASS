import { useBinarySensor, useSensor } from 'hass-react'
import { cn } from '#/lib/cn'

function ReadingValue({ entityId, suffix }: { entityId: string; suffix?: string }) {
  const sensor = useSensor(entityId)
  if (sensor.isUnavailable) return <span>—</span>
  const value =
    sensor.numericValue != null
      ? Math.round(sensor.numericValue * 10) / 10
      : (sensor.value ?? sensor.state)
  const unit = suffix ?? sensor.unitOfMeasurement ?? ''
  return (
    <span className="tabular-nums">
      {value}
      {unit ? <span className="text-ink-muted">{unit}</span> : null}
    </span>
  )
}

function OccupancyBadge({ entityId }: { entityId: string }) {
  const occupancy = useBinarySensor(entityId)
  if (occupancy.isUnavailable) return null
  return (
    <span
      className={cn(
        'shrink-0 rounded-control px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
        occupancy.isOn ? 'bg-accent-soft text-accent' : 'bg-canvas text-ink-faint',
      )}
    >
      {occupancy.isOn ? 'Occupied' : 'Empty'}
    </span>
  )
}

/** Temp + humidity (+ optional occupancy) from one physical sensor on a single card. */
export function ClimateReadingCard({
  label,
  tempId,
  humidityId,
  occupancyId,
}: {
  label: string
  tempId: string
  humidityId?: string
  occupancyId?: string
}) {
  const temp = useSensor(tempId)
  const unavailable = temp.isUnavailable

  return (
    <div
      className={cn(
        'min-w-0 rounded-card border-ui border-border-subtle bg-surface shadow-card modern:border-transparent px-3.5 py-3 sm:px-4',
        unavailable && 'opacity-40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-semibold text-ink">{label}</p>
        {occupancyId ? <OccupancyBadge entityId={occupancyId} /> : null}
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:mt-2 sm:gap-x-4">
        <p className="text-display text-xl text-ink sm:text-2xl">
          <ReadingValue entityId={tempId} suffix="°" />
        </p>
        {humidityId ? (
          <p className="truncate text-xs text-ink-muted sm:text-sm">
            <ReadingValue entityId={humidityId} suffix="%" /> humidity
          </p>
        ) : null}
      </div>
    </div>
  )
}
