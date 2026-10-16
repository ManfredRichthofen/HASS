import { createFileRoute } from '@tanstack/react-router'
import { TempHistoryChart } from '#/components/charts/TempHistoryChart'
import { ClimateCard } from '#/components/entities/ClimateCard'
import { ClimateReadingCard } from '#/components/entities/ClimateReadingCard'
import { FanLightTile } from '#/components/entities/FanLightTile'
import { FanTile } from '#/components/entities/FanTile'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'
import { entities, houseClimateReadings } from '#/config/dashboard'
import { useEntityHistory } from '#/hooks/useEntityHistory'

export const Route = createFileRoute('/climate')({ component: ClimatePage })

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
        <ClimateCard
          entityId={entities.climate}
          fanId="fan.mts300"
        />
      </Section>

      <Section title="History">
        <LivingTempHistory />
      </Section>

      <Section title="Room readings">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {houseClimateReadings.map((room) => (
            <ClimateReadingCard key={room.tempId} {...room} />
          ))}
        </div>
      </Section>

      <Section title="Fans">
        <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2">
          {/* Thermostat fan lives on ClimateCard above — don't duplicate. */}
          <FanLightTile
            label="Bedroom ceiling"
            lightId="light.bedroom_ceiling_light"
            fanId="fan.bedroom_ceiling_fan"
          />
          <FanTile
            entityId="fan.afg_smt_pro_2_0"
            label="Garage fan"
            tempId="sensor.afg_smt_pro_2_0_temperature"
            humidityId="sensor.afg_smt_pro_2_0_humidity"
          />
        </div>
      </Section>
    </Page>
  )
}
