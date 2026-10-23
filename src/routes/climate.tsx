import { createFileRoute } from '@tanstack/react-router'
import { TempHistoryChart } from '#/components/charts/TempHistoryChart'
import { ClimateCard } from '#/components/entities/ClimateCard'
import { ClimateReadingCard } from '#/components/entities/ClimateReadingCard'
import { FanTile } from '#/components/entities/FanTile'
import { WeatherCard } from '#/components/home/WeatherCard'
import { CardGrid } from '#/components/layout/CardGrid'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'
import { climateFans, entities, houseClimateReadings } from '#/config/dashboard'
import { useEntityHistory } from '#/hooks/useEntityHistory'

export const Route = createFileRoute('/climate')({ component: ClimatePage })

function LivingTempHistory() {
  const { points, loading } = useEntityHistory(entities.livingTemp, 24)

  return (
    <div className="rounded-card border-ui border-border-subtle bg-surface p-5 shadow-card modern:border-transparent">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-display text-lg text-ink">Living room</p>
        <p className="text-label">Last 24 hours</p>
      </div>
      {loading && points.length < 2 ? (
        <div className="h-[220px] animate-pulse rounded-control bg-surface-hover" />
      ) : points.length < 2 ? (
        <p className="py-16 text-center text-sm text-ink-muted">Not enough history yet</p>
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

      <div className="grid items-start gap-section @2xl:grid-cols-2 @2xl:gap-8">
        <ClimateCard entityId={entities.climate} />
        <div className="grid gap-section">
          <Section title="Outside">
            <WeatherCard />
          </Section>
          <Section title="History">
            <LivingTempHistory />
          </Section>
        </div>
      </div>

      <Section title="Room by room">
        <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2 @4xl:grid-cols-3">
          {houseClimateReadings.map((room) => (
            <ClimateReadingCard key={room.tempId} {...room} />
          ))}
        </div>
      </Section>

      {climateFans.length > 0 ? (
        <Section title="Fans">
          <CardGrid>
            {climateFans.map((fan) => (
              <FanTile
                key={fan.fanId}
                entityId={fan.fanId}
                label={fan.label}
                tempId={fan.tempId}
                humidityId={fan.humidityId}
              />
            ))}
          </CardGrid>
        </Section>
      ) : null}
    </Page>
  )
}
