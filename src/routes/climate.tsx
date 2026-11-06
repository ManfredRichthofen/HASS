import { createFileRoute } from '@tanstack/react-router'
import { useClimate } from 'hass-react'
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

/** One line for the whole page: how warm it is inside and what the AC is doing about it. */
function ClimateSummary() {
  const climate = useClimate(entities.climate)
  if (climate.isUnavailable || climate.currentTemperature == null) return null
  const inside = `${Math.round(climate.currentTemperature)}° inside`
  const action = String((climate.attributes as { hvac_action?: string }).hvac_action ?? '')
  const dual = climate.targetTemperature == null && climate.targetTempLow != null
  const target = climate.targetTemperature
  let detail = ''
  if (climate.mode === 'off') detail = 'the thermostat is off'
  else if (dual) detail = `held between ${Math.round(climate.targetTempLow ?? 0)}° and ${Math.round(climate.targetTempHigh ?? 0)}°`
  else if (action === 'cooling' && target != null) detail = `cooling to ${Math.round(target)}°`
  else if (action === 'heating' && target != null) detail = `heating to ${Math.round(target)}°`
  else if (target != null) detail = `set to ${Math.round(target)}°, not running`
  return (
    <m.p
      variants={staggerItem}
      className="text-display text-[1.5rem] leading-tight text-balance text-ink walnut:font-light"
    >
      {inside}
      {detail ? `, ${detail}` : ''}.
    </m.p>
  )
}

function ClimatePage() {
  return (
    <m.div initial="initial" animate="animate" variants={staggerContainer}>
      <Page>
        <PageHeader title="Climate" />
        <ClimateSummary />

        {/* Thermostat first, then the weather outside, each room, and the fans. */}
        <div className="grid items-start gap-section @xl:grid-cols-2 @xl:gap-x-6">
          <m.div variants={staggerItem} className="min-w-0">
            <ClimateCard entityId={entities.climate} />
          </m.div>
          <Section title="Outside">
            <WeatherCard />
          </Section>
        </div>

        <Section title="Room by room">
          <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4 @xl:gap-4">
            {houseClimateReadings.map((room) => (
              <ClimateReadingCard key={room.tempId} {...room} />
            ))}
          </div>
        </Section>

        {climateFans.length > 0 ? (
          <Section title="Air">
            <CardGrid className="items-start">
              {climateFans.map((fan) => (
                <FanTile
                  key={fan.fanId}
                  entityId={fan.fanId}
                  label={fan.label}
                  tempId={fan.tempId}
                  humidityId={fan.humidityId}
                readings={fan.readings}
                />
              ))}
            </CardGrid>
          </Section>
        ) : null}
      </Page>
    </m.div>
  )
}
