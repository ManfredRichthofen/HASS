import { Link, createFileRoute } from '@tanstack/react-router'
import { useBinarySensor, useSensor } from 'hass-react'
import { ChevronRight } from 'lucide-react'
import { primaryAreas, type AreaConfig } from '#/config/dashboard'
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
        'flex items-center justify-between gap-3 rounded-3xl border border-border-subtle bg-surface p-4 transition',
        'hover:border-accent/30 hover:bg-surface-hover active:scale-[0.99]',
      )}
    >
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold text-ink">{area.name}</p>
        <p className="mt-0.5 text-xs text-ink-muted">
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
    <div>
      <PageHeader title="Rooms" subtitle="Browse by area" />
      <div className="grid gap-3 md:grid-cols-2">
        {primaryAreas.map((area) => (
          <RoomCard key={area.id} area={area} />
        ))}
      </div>
    </div>
  )
}
