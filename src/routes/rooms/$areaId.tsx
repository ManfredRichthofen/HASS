import { Link, createFileRoute } from '@tanstack/react-router'
import { useEntityGroup, useServiceCall } from 'hass-react'
import { Lightbulb, Power } from 'lucide-react'
import { cn } from '#/lib/cn'
import { m, snappy } from '#/lib/motion'
import { notify } from '#/components/ui/toast'
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
      whileTap={{ scale: 0.98 }}
      transition={snappy}
      className={cn(
        'flex min-h-16 w-full items-center gap-3 rounded-3xl border p-3.5 text-left transition-colors duration-300',
        isOn ? 'bg-on border-transparent' : 'border-border-subtle bg-surface',
      )}
    >
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-2xl',
          isOn ? 'bg-white/20 text-white' : 'bg-[#252e40] text-ink-muted',
        )}
      >
        <Lightbulb className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold">All lights</span>
        <span
          className={cn(
            'block text-xs',
            isOn ? 'text-white/80' : 'text-ink-muted',
          )}
        >
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
        subtitle="Lights, fans and media"
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
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
            {area.sensors.map((id) => (
              <SensorChip key={id} entityId={id} />
            ))}
          </div>
        </Section>
      ) : null}

      {roomLights.length > 1 ? <AllLightsCard ids={roomLights} /> : null}

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
