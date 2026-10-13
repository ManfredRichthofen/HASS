import { createFileRoute } from '@tanstack/react-router'
import { entities } from '#/config/dashboard'
import { ClimateCard } from '#/components/entities/ClimateCard'
import { FanTile } from '#/components/entities/FanTile'
import { SensorChip } from '#/components/entities/SensorChip'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'

export const Route = createFileRoute('/climate')({ component: ClimatePage })

const roomSensors = [
  { id: 'sensor.mts300_temperature', label: 'Living room' },
  { id: 'sensor.mts300_humidity', label: 'Living humidity' },
  { id: 'sensor.presence_multi_sensor_fp300_temperature', label: 'Bedroom' },
  { id: 'sensor.presence_multi_sensor_fp300_humidity', label: 'Bedroom humidity' },
  { id: 'sensor.office_climate_sensor_temperature', label: 'Office' },
  { id: 'sensor.office_climate_sensor_humidity', label: 'Office humidity' },
  { id: 'sensor.afg_smt_pro_2_0_temperature', label: 'Garage' },
  { id: 'sensor.afg_smt_pro_2_0_humidity', label: 'Garage humidity' },
  { id: 'sensor.outdoor_temperature', label: 'Outside' },
]

function ClimatePage() {
  return (
    <div>
      <PageHeader title="Climate" subtitle="Comfort across the home" />

      <Section>
        <ClimateCard entityId={entities.climate} />
      </Section>

      <Section title="Room readings">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {roomSensors.map((s) => (
            <SensorChip key={s.id} entityId={s.id} label={s.label} />
          ))}
        </div>
      </Section>

      <Section title="Fans">
        <div className="grid gap-3 md:grid-cols-2">
          {entities.favorites.fans.map((id) => (
            <FanTile key={id} entityId={id} />
          ))}
          <FanTile entityId="fan.afg_smt_pro_2_0" />
        </div>
      </Section>
    </div>
  )
}
