import { Link, createFileRoute } from '@tanstack/react-router'
import { getArea, isRoomLight } from '#/config/dashboard'
import { EntityGrid } from '#/components/entities/EntityGrid'
import { FanTile } from '#/components/entities/FanTile'
import { LightTile } from '#/components/entities/LightTile'
import { MediaCard } from '#/components/entities/MediaCard'
import { SensorChip } from '#/components/entities/SensorChip'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'

export const Route = createFileRoute('/rooms/$areaId')({
  component: RoomDetailPage,
})

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

  const roomLights = area.lights.filter(isRoomLight)
  const empty =
    roomLights.length +
      area.fans.length +
      area.media.length +
      area.sensors.length ===
    0

  return (
    <Page>
      <PageHeader
        title={area.name}
        subtitle="Controls & sensors"
        backTo="/rooms"
        backLabel="Rooms"
      />

      {empty ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface/50 p-8 text-center text-sm text-ink-muted">
          No curated devices for this room yet.
        </p>
      ) : null}

      {area.sensors.length > 0 ? (
        <Section title="Climate">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3">
            {area.sensors.map((id) => (
              <SensorChip key={id} entityId={id} />
            ))}
          </div>
        </Section>
      ) : null}

      {roomLights.length > 0 ? (
        <Section title="Lights">
          <EntityGrid>
            {roomLights.map((id) => (
              <LightTile key={id} entityId={id} />
            ))}
          </EntityGrid>
        </Section>
      ) : null}

      {area.fans.length > 0 ? (
        <Section title="Fans">
          <EntityGrid>
            {area.fans.map((id) => (
              <FanTile key={id} entityId={id} />
            ))}
          </EntityGrid>
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
