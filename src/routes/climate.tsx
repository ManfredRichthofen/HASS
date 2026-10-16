import { createFileRoute } from '@tanstack/react-router'
import { useSensor } from 'hass-react'
import { TempHistoryChart } from '#/components/charts/TempHistoryChart'
import { ClimateCard } from '#/components/entities/ClimateCard'
import { FanTile } from '#/components/entities/FanTile'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'
import { entities } from '#/config/dashboard'
import { useEntityHistory } from '#/hooks/useEntityHistory'

export const Route = createFileRoute('/climate')({ component: ClimatePage })

const roomReadings = [
  {
    name: 'Living room',
    tempId: 'sensor.mts300_temperature',
    humidityId: 'sensor.mts300_humidity',
  },
  {
    name: 'Bedroom',
    tempId: 'sensor.presence_multi_sensor_fp300_temperature',
    humidityId: 'sensor.presence_multi_sensor_fp300_humidity',
  },
  {
    name: 'Office',
    tempId: 'sensor.office_climate_sensor_temperature',
    humidityId: 'sensor.office_climate_sensor_humidity',
  },
  {
    name: 'Garage',
    tempId: 'sensor.afg_smt_pro_2_0_temperature',
    humidityId: 'sensor.afg_smt_pro_2_0_humidity',
  },
  {
    name: 'Outside',
    tempId: 'sensor.outdoor_temperature',
  },
] as const

function ReadingValue({
  entityId,
  suffix,
}: {
  entityId: string
  suffix?: string
}) {
  const sensor = useSensor(entityId)
  if (sensor.isUnavailable) return <span>—</span>
  const value =
    sensor.numericValue != null
      ? Math.round(sensor.numericValue * 10) / 10
      : sensor.value ?? sensor.state
  const unit = suffix ?? sensor.unitOfMeasurement ?? ''
  return (
    <span className="tabular-nums">
      {value}
      {unit ? <span className="text-ink-muted">{unit}</span> : null}
    </span>
  )
}

function RoomReadingCard({
  name,
  tempId,
  humidityId,
}: {
  name: string
  tempId: string
  humidityId?: string
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border-subtle bg-surface px-3.5 py-3 sm:px-4">
      <p className="truncate text-sm font-semibold text-ink">{name}</p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:mt-2 sm:gap-x-4">
        <p className="font-display text-xl font-semibold text-ink sm:text-2xl">
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

function LivingTempHistory() {
  const { points, loading } = useEntityHistory(entities.livingTemp, 24)

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface px-3.5 py-3 sm:px-4 sm:py-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Living room · 24h</p>
        <p className="text-xs text-ink-muted">Temperature</p>
      </div>
      {loading && points.length < 2 ? (
        <div className="h-[220px] animate-pulse rounded-xl bg-border/20" />
      ) : points.length < 2 ? (
        <p className="py-16 text-center text-sm text-ink-muted">
          Not enough history yet
        </p>
      ) : (
        <TempHistoryChart
          points={points}
          variant="full"
          height={220}
          ariaLabel="Living room temperature over 24 hours"
        />
      )}
    </div>
  )
}

function ClimatePage() {
  return (
    <Page>
      <PageHeader title="Climate" subtitle="Comfort across the home" />

      <Section>
        <ClimateCard entityId={entities.climate} />
      </Section>

      <Section title="History">
        <LivingTempHistory />
      </Section>

      <Section title="Room readings">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {roomReadings.map((room) => (
            <RoomReadingCard
              key={room.name}
              name={room.name}
              tempId={room.tempId}
              humidityId={'humidityId' in room ? room.humidityId : undefined}
            />
          ))}
        </div>
      </Section>

      <Section title="Fans">
        <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2">
          {entities.favorites.fans.map((id) => (
            <FanTile key={id} entityId={id} />
          ))}
          <FanTile entityId="fan.afg_smt_pro_2_0" />
        </div>
      </Section>
    </Page>
  )
}
