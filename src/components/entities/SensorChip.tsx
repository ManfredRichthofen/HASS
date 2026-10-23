import { useSensor } from 'hass-react'
import { Reading } from '#/components/entities/Readings'
import { entityName } from '#/lib/entityName'

/** A single sensor shown as a Reading; place several inside `<Readings>`. */
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
    <Reading
      value={sensor.isUnavailable ? '—' : value}
      unit={sensor.isUnavailable ? undefined : unit || undefined}
      label={name}
      muted={sensor.isUnavailable}
    />
  )
}
