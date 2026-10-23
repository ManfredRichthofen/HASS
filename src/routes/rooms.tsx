import { createFileRoute, Outlet, useParams } from '@tanstack/react-router'
import { AllLightsOff } from '#/components/rooms/AllLightsOff'
import { RoomListItem } from '#/components/rooms/RoomListItem'
import { primaryAreas } from '#/config/dashboard'

export const Route = createFileRoute('/rooms')({ component: RoomsLayout })

/** Phone/tablet: card grid or full room page. Desktop (xl): room list + open room. */
function RoomsLayout() {
  const params = useParams({ strict: false }) as { areaId?: string }

  return (
    <div className="xl:grid xl:grid-cols-[18rem_minmax(0,1fr)] xl:items-start xl:gap-10">
      <aside className="hidden xl:sticky xl:top-8 xl:grid xl:gap-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-display text-3xl text-ink walnut:font-light">Rooms</h2>
          <AllLightsOff />
        </div>
        <nav aria-label="Rooms" className="flex flex-col gap-1 brutal:gap-0">
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
