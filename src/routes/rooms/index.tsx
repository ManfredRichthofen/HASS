import { Link, createFileRoute } from '@tanstack/react-router'
import { useBinarySensor, useSensor } from 'hass-react'
import { ChevronRight } from 'lucide-react'
import { primaryAreas, type AreaConfig } from '#/config/dashboard'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { cn } from '#/lib/cn'

export const Route = createFileRoute('/rooms/')({ component: RoomsPage })

function OccupancyHint({ entityId }: { entityId: string }) {
  const occupancy = useBinarySensor(entityId)
  if (occupancy.isUnavailable) return null
  return (
    <span>{occupancy.state === 'on' ? ' · Occupied' : ' · Empty'}</span>
  )
}

function TempHint({ entityId }: { entityId: string }) {
  const temp = useSensor(entityId)
  if (temp.isUnavailable || temp.numericValue == null) return null
  return <span>{` · ${Math.round(temp.numericValue)}°`}</span>
}

function RoomCard({ area }: { area: AreaConfig }) {
  const deviceCount =
    area.lights.length + area.fans.length + area.media.length
  const tempId = area.sensors.find((id) => id.includes('temperature'))

  return (
    <Link
      to="/rooms/$areaId"
      params={{ areaId: area.id }}
      className={cn(
        'flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface px-4 py-3.5 transition sm:min-h-16 sm:py-4',
        'hover:border-accent/30 hover:bg-surface-hover active:scale-[0.99]',
      )}
    >
      <div className="min-w-0">
        <p className="truncate font-display text-base font-semibold text-ink sm:text-lg">
          {area.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {deviceCount} device{deviceCount === 1 ? '' : 's'}
          {area.occupancy ? <OccupancyHint entityId={area.occupancy} /> : null}
          {tempId ? <TempHint entityId={tempId} /> : null}
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-ink-faint" />
    </Link>
  )
}

function RoomsPage() {
  return (
    <Page>
      <PageHeader title="Rooms" subtitle="Browse by area" />
      <div className="grid gap-2 sm:gap-2.5 md:grid-cols-2">
        {primaryAreas.map((area) => (
          <RoomCard key={area.id} area={area} />
        ))}
      </div>
    </Page>
  )
}
