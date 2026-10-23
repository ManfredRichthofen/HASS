import { createFileRoute, Link } from '@tanstack/react-router'
import { useEntityGroup, useServiceCall } from 'hass-react'
import { Droplets, Lightbulb, LightbulbOff } from 'lucide-react'
import { ApplianceRow } from '#/components/entities/ApplianceRow'
import { ClimateReadingCard } from '#/components/entities/ClimateReadingCard'
import { DeviceList } from '#/components/entities/DeviceRow'
import { EntityGrid } from '#/components/entities/EntityGrid'
import { FanLightTile } from '#/components/entities/FanLightTile'
import { FanTile } from '#/components/entities/FanTile'
import { LightTile } from '#/components/entities/LightTile'
import { MediaCard } from '#/components/entities/MediaCard'
import { Readings, SensorReading } from '#/components/entities/Readings'
import { SensorChip } from '#/components/entities/SensorChip'
import { SwitchRow } from '#/components/entities/SwitchRow'
import { CardGrid } from '#/components/layout/CardGrid'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'
import { Button } from '#/components/ui/button'
import { notify } from '#/components/ui/toast'
import { areaLightIds, getArea, isRoomLight } from '#/config/dashboard'
import { useScrollSafePress } from '#/hooks/useScrollSafePress'
import { entityName } from '#/lib/entityName'

export const Route = createFileRoute('/rooms/$areaId')({
  component: RoomDetailPage,
})

/** Room-wide light switch for the header: "All lights off" when any are on, else "Lights on". */
function RoomLightsButton({ ids, name }: { ids: string[]; name: string }) {
  const { callService } = useServiceCall()
  const lights = useEntityGroup([...ids])
  const on = lights.filter((l) => l.state === 'on').length

  async function toggle() {
    try {
      await callService('light', on > 0 ? 'turn_off' : 'turn_on', { entity_id: ids })
      notify(on > 0 ? `${name} lights off` : `${name} lights on`)
    } catch (e) {
      notify('Lights failed', e instanceof Error ? e.message : 'Error')
    }
  }

  const press = useScrollSafePress(() => void toggle())

  return (
    <Button
      size="sm"
      variant={on > 0 ? 'secondary' : 'primary'}
      {...press}
      aria-label={on > 0 ? `Turn off all ${name} lights` : `Turn on all ${name} lights`}
    >
      {on > 0 ? (
        <LightbulbOff className="size-[18px]" aria-hidden />
      ) : (
        <Lightbulb className="size-[18px]" aria-hidden />
      )}
      {on > 0 ? 'All lights off' : 'Lights on'}
    </Button>
  )
}

function RoomSubtitle({ ids }: { ids: string[] }) {
  const lights = useEntityGroup([...ids])
  const on = lights.filter((l) => l.state === 'on').length
  if (ids.length === 0) return null
  return <>{on === 0 ? 'Lights off' : `${on} of ${ids.length} lights on`}</>
}

/**
 * One room's own page: header with readings and room-wide actions, then its
 * lights, climate, fans and other devices. Empty sections are left out.
 */
function RoomDetailPage() {
  const { areaId } = Route.useParams()
  const area = getArea(areaId)

  if (!area) {
    return (
      <Page className="py-12 text-center">
        <p className="text-ink-muted">Room not found</p>
        <Link to="/rooms" className="mt-3 inline-block font-semibold text-ink underline">
          Back to rooms
        </Link>
      </Page>
    )
  }

  const roomLights = areaLightIds(area)
  const standaloneLights = area.lights.filter(isRoomLight)
  const climateReadings = area.climateReadings ?? []
  const fanLights = area.fanLights ?? []
  const fanDevices = area.fanDevices ?? []
  const hasFans = area.fans.length > 0 || fanDevices.length > 0 || fanLights.length > 0
  const firstReading = climateReadings[0]
  const extraReadings = climateReadings.slice(1)
  const empty =
    roomLights.length +
      area.fans.length +
      fanDevices.length +
      fanLights.length +
      area.media.length +
      area.sensors.length +
      climateReadings.length +
      (area.appliances?.length ?? 0) +
      (area.switches?.length ?? 0) ===
    0

  return (
    <Page>
      <PageHeader
        title={area.name}
        subtitle={<RoomSubtitle ids={roomLights} />}
        backTo="/rooms"
        backLabel="Rooms"
        backClassName="xl:hidden"
      >
        {firstReading || area.sensors.length > 0 ? (
          <Readings className="mt-2">
            {firstReading ? (
              <SensorReading entityId={firstReading.tempId} label="Temperature" unit="°" />
            ) : null}
            {firstReading?.humidityId ? (
              <SensorReading entityId={firstReading.humidityId} label="Humidity" unit="%" />
            ) : null}
            {area.sensors.slice(0, firstReading ? 1 : 3).map((id) => (
              <SensorChip key={id} entityId={id} />
            ))}
          </Readings>
        ) : null}
        {roomLights.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-2.5">
            <RoomLightsButton ids={roomLights} name={area.name} />
          </div>
        ) : null}
      </PageHeader>

      {empty ? (
        <p className="rounded-card border-ui border-dashed border-border p-8 text-center text-sm text-ink-muted">
          Nothing set up for this room yet.
        </p>
      ) : null}

      <div className="grid items-start gap-section @xl:grid-cols-2 @xl:gap-8">
        <div className="grid min-w-0 gap-section">
          {standaloneLights.length > 0 ? (
            <Section title="Lights">
              <EntityGrid>
                {standaloneLights.map((id) => (
                  <LightTile key={id} entityId={id} />
                ))}
              </EntityGrid>
            </Section>
          ) : null}

          {hasFans ? (
            <Section
              title={
                fanLights.length && !area.fans.length && !fanDevices.length ? 'Ceiling' : 'Fans'
              }
            >
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
                {fanLights.length > 0 ? (
                  <CardGrid>
                    {fanLights.map((kit) => (
                      <FanLightTile key={kit.fanId} {...kit} />
                    ))}
                  </CardGrid>
                ) : null}
                {fanDevices.length > 0 || area.fans.length > 0 ? (
                  <CardGrid>
                    {fanDevices.map((device) => (
                      <FanTile
                        key={device.fanId}
                        entityId={device.fanId}
                        label={device.label}
                        tempId={device.tempId}
                        humidityId={device.humidityId}
                      />
                    ))}
                    {area.fans.map((id) => (
                      <FanTile key={id} entityId={id} />
                    ))}
                  </CardGrid>
                ) : null}
              </div>
            </Section>
          ) : null}
        </div>
        <div className="grid min-w-0 gap-section">
          {extraReadings.length > 0 ? (
            <Section title="Climate">
              <div className="@container">
                <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @2xl:grid-cols-3">
                  {extraReadings.map((reading) => (
                    <ClimateReadingCard key={reading.tempId} {...reading} />
                  ))}
                </div>
              </div>
            </Section>
          ) : null}

          {area.media.length > 0 ? (
            <Section title="Music & TV">
              <CardGrid>
                {area.media.map((id) => (
                  <MediaCard key={id} entityId={id} />
                ))}
              </CardGrid>
            </Section>
          ) : null}

          {area.appliances?.length ? (
            <Section title="Appliances">
              <DeviceList>
                {area.appliances.map((a) => (
                  <ApplianceRow key={a.powerId} {...a} />
                ))}
              </DeviceList>
            </Section>
          ) : null}

          {area.switches?.length ? (
            <Section title="Irrigation">
              <DeviceList>
                {area.switches.map((id) => (
                  <SwitchRow key={id} entityId={id} label={entityName(id)} icon={Droplets} />
                ))}
              </DeviceList>
            </Section>
          ) : null}
        </div>
      </div>
    </Page>
  )
}
