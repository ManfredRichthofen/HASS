import { createFileRoute } from '@tanstack/react-router'
import { ClimateCard } from '#/components/entities/ClimateCard'
import { ClimateReadingCard } from '#/components/entities/ClimateReadingCard'
import { FanTile } from '#/components/entities/FanTile'
import { WeatherCard } from '#/components/home/WeatherCard'
import { CardGrid } from '#/components/layout/CardGrid'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'
import { climateFans, entities, houseClimateReadings } from '#/config/dashboard'
import { m, staggerContainer, staggerItem } from '#/lib/motion'

export const Route = createFileRoute('/climate')({ component: ClimatePage })

function ClimatePage() {
  return (
    <m.div initial="initial" animate="animate" variants={staggerContainer}>
      <Page>
        <PageHeader title="Climate" />

        {/*
          Mobile: stacked thermostat → outside → readings → fans.
          Wide content (@xl): thermostat | outside side-by-side.
        */}
        <div className="grid items-stretch gap-section @xl:grid-cols-2 @xl:gap-x-6 @xl:gap-y-5">
          <m.div variants={staggerItem} className="min-w-0">
            <ClimateCard entityId={entities.climate} />
          </m.div>
          <Section
            title="Outside"
            className="@xl:flex @xl:h-full @xl:flex-col @xl:[&>div:first-child]:mb-2.5 @xl:[&>div:first-child]:min-h-9"
          >
            <div className="@xl:min-h-0 @xl:flex-1">
              <WeatherCard />
            </div>
          </Section>
        </div>

        <Section title="Room by room">
          <div className="grid grid-cols-2 gap-3 @xl:grid-cols-3 @xl:gap-4">
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
    </m.div>
  )
}
