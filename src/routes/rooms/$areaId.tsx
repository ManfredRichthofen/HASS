import { createFileRoute, Link } from '@tanstack/react-router'
import { useEntityGroup, useServiceCall } from 'hass-react'
import { Lightbulb, Power } from 'lucide-react'
import { ApplianceRow } from '#/components/entities/ApplianceRow'
import { ClimateReadingCard } from '#/components/entities/ClimateReadingCard'
import { EntityGrid } from '#/components/entities/EntityGrid'
import { FanLightTile } from '#/components/entities/FanLightTile'
import { FanTile } from '#/components/entities/FanTile'
import { LightTile } from '#/components/entities/LightTile'
import { MediaCard } from '#/components/entities/MediaCard'
import { SensorChip } from '#/components/entities/SensorChip'
import { SwitchRow } from '#/components/entities/SwitchRow'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'
import { notify } from '#/components/ui/toast'
import { areaLightIds, getArea, isRoomLight } from '#/config/dashboard'
import { cn } from '#/lib/cn'
import { entityName } from '#/lib/entityName'
import { m, snappy, tap } from '#/lib/motion'

export const Route = createFileRoute('/rooms/$areaId')({
  component: RoomDetailPage,
})

/** One-tap master switch for every light in the room. */
function AllLightsCard({ ids }: { ids: string[] }) {
  const { callService } = useServiceCall()
  const lights = useEntityGroup([...ids])
  const on = lights.filter((l) => l.state === 'on').length
  const isOn = on > 0

  async function toggle() {
    try {
      await callService('light', isOn ? 'turn_off' : 'turn_on', {
        entity_id: ids,
      })
    } catch (e) {
      notify('Lights failed', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <m.button
      type="button"
      onClick={() => void toggle()}
      whileTap={tap.soft}
      transition={snappy}
      className={cn(
        'flex min-h-16 w-full items-center gap-3 rounded-3xl border p-3.5 text-left transition-state',
        isOn ? 'bg-on border-transparent' : 'border-border-subtle bg-surface',
      )}
    >
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-2xl',
          isOn ? 'bg-white/20 text-white' : 'bg-icon-well text-ink-muted',
        )}
      >
        <Lightbulb className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold">All lights</span>
        <span className={cn('block text-xs', isOn ? 'text-white/80' : 'text-ink-muted')}>
          {isOn ? `${on} of ${ids.length} on` : 'All off'}
        </span>
      </span>
      <Power className={cn('size-5', isOn ? 'text-white' : 'text-ink-muted')} />
    </m.button>
  )
}

function RoomDetailPage() {
  const { areaId } = Route.useParams()
  const area = getArea(areaId)

  if (!area) {
    return (
      <Page className="py-12 text-center">
        <p className="text-ink-muted">Room not found</p>
        <Link to="/rooms" className="mt-3 inline-block text-accent">
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
        subtitle="Lights, fans and media"
        backTo="/rooms"
        backLabel="Rooms"
      />

      {empty ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface/50 p-8 text-center text-sm text-ink-muted">
          No curated devices for this room yet.
        </p>
      ) : null}

      {climateReadings.length > 0 || area.sensors.length > 0 ? (
        <Section title="Climate">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
            {climateReadings.map((reading) => (
              <ClimateReadingCard key={reading.tempId} {...reading} />
            ))}
            {area.sensors.map((id) => (
              <SensorChip key={id} entityId={id} />
            ))}
          </div>
        </Section>
      ) : null}

      {roomLights.length > 1 ? <AllLightsCard ids={roomLights} /> : null}

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
          title={fanLights.length && !area.fans.length && !fanDevices.length ? 'Ceiling' : 'Fans'}
        >
          {fanLights.length > 0 ? (
            <div className="mb-2.5 grid gap-2.5 sm:gap-3 md:grid-cols-2">
              {fanLights.map((kit) => (
                <FanLightTile key={kit.fanId} {...kit} />
              ))}
            </div>
          ) : null}
          {fanDevices.length > 0 || area.fans.length > 0 ? (
            <EntityGrid>
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
            </EntityGrid>
          ) : null}
        </Section>
      ) : null}

      {area.appliances?.length ? (
        <Section title="Appliances">
          <div className="grid gap-2.5 md:grid-cols-2">
            {area.appliances.map((a) => (
              <ApplianceRow key={a.powerId} {...a} />
            ))}
          </div>
        </Section>
      ) : null}

      {area.switches?.length ? (
        <Section title="Irrigation">
          <div className="grid gap-2.5 md:grid-cols-2">
            {area.switches.map((id) => (
              <SwitchRow key={id} entityId={id} label={entityName(id)} />
            ))}
          </div>
        </Section>
      ) : null}

      {area.media.length > 0 ? (
        <Section title="Media">
          <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2">
            {area.media.map((id) => (
              <MediaCard key={id} entityId={id} />
            ))}
          </div>
        </Section>
      ) : null}
    </Page>
  )
}
