import { createFileRoute } from '@tanstack/react-router'
import { useClimate } from 'hass-react'
import { ClimateCard } from '#/components/entities/ClimateCard'
import { ClimateReadingCard } from '#/components/entities/ClimateReadingCard'
import { FanTile } from '#/components/entities/FanTile'
import { WeatherCard } from '#/components/home/WeatherCard'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'
import { climateFans, entities, houseClimateReadings } from '#/config/dashboard'
import { cn } from '#/lib/cn'
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
      className="text-display text-[1.5rem] leading-tight text-balance text-ink"
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

        {/*
          Phone: one column (thermostat, outside, rooms, air).
          Portrait tablet (@xl): thermostat beside outside, rooms and air full width below.
          Landscape tablet (@3xl): the thermostat holds the left column and stays pinned
          in view, while everything you glance at (outside, rooms, air) stacks on the right.
        */}
        <div className="grid gap-section @xl:grid-cols-2 @xl:gap-x-6 @3xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] @5xl:gap-x-8">
          <m.div
            variants={staggerItem}
            className="min-w-0 @3xl:sticky @3xl:top-[max(1rem,env(safe-area-inset-top))] @3xl:self-start"
          >
            <ClimateCard entityId={entities.climate} />
          </m.div>

          <div className="contents @3xl:flex @3xl:min-w-0 @3xl:flex-col @3xl:gap-section">
            <Section title="Outside" className="flex flex-col [&>*:last-child]:flex-1">
              <WeatherCard />
            </Section>

            <Section title="Room by room" className="@xl:col-span-2">
              <div className="grid grid-cols-2 gap-3 @xl:gap-4 @2xl:grid-cols-4 @3xl:grid-cols-2">
                {houseClimateReadings.map((room) => (
                  <ClimateReadingCard key={room.tempId} {...room} />
                ))}
              </div>
            </Section>

            {climateFans.length > 0 ? (
              <Section title="Air" className="@xl:col-span-2">
                <div
                  className={cn(
                    'grid gap-3 [&>*]:min-w-0',
                    climateFans.length > 1 && '@xl:grid-cols-2 @3xl:grid-cols-1',
                  )}
                >
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
                </div>
              </Section>
            ) : null}
          </div>
        </div>
      </Page>
    </m.div>
  )
}
