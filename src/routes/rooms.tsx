import { createFileRoute, Outlet, useParams } from '@tanstack/react-router'
import { AllLightsOff } from '#/components/rooms/AllLightsOff'
import { RoomListItem } from '#/components/rooms/RoomListItem'
import { primaryAreas } from '#/config/dashboard'

export const Route = createFileRoute('/rooms')({ component: RoomsLayout })

/** Phone/portrait: just the child route. Wide tablet: room list + detail pane. */
function RoomsLayout() {
  const params = useParams({ strict: false }) as { areaId?: string }

  return (
    <div className="xl:grid xl:grid-cols-[19rem_minmax(0,1fr)] xl:items-start xl:gap-8">
      <aside className="hidden xl:sticky xl:top-6 xl:block">
        <h2 className="mb-3 font-display text-2xl font-semibold tracking-tight text-ink">Rooms</h2>
        <div className="mb-3">
          <AllLightsOff />
        </div>
        <nav aria-label="Rooms" className="flex flex-col gap-2">
          {primaryAreas.map((area) => (
            <RoomListItem key={area.id} area={area} active={params.areaId === area.id} />
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
