import { useSensor } from 'hass-react'
import { cn } from '#/lib/cn'
import { entityName } from '#/lib/entityName'

export function SensorChip({ entityId, label }: { entityId: string; label?: string }) {
  const sensor = useSensor(entityId)
  const name = label ?? entityName(entityId, sensor.attributes.friendly_name)
  const unit = sensor.unitOfMeasurement ?? ''
  const value =
    sensor.numericValue != null
      ? Number.isInteger(sensor.numericValue)
        ? sensor.numericValue
        : Math.round(sensor.numericValue * 10) / 10
      : (sensor.value ?? sensor.state)

  return (
    <div
      className={cn(
        'rounded-2xl border border-border-subtle bg-surface px-3 py-2.5',
        sensor.isUnavailable && 'opacity-40',
      )}
    >
      <p className="text-[11px] text-ink-muted">{name}</p>
      <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-ink">
        {sensor.isUnavailable ? '—' : value}
        {unit && !sensor.isUnavailable ? (
          <span className="ml-0.5 text-sm font-medium text-ink-muted">{unit}</span>
        ) : null}
      </p>
    </div>
  )
}
