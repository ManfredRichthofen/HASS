import { createFileRoute, Outlet, useParams } from '@tanstack/react-router'
import { AllLightsOff } from '#/components/rooms/AllLightsOff'
import { RoomListItem } from '#/components/rooms/RoomListItem'
import { primaryAreas } from '#/config/dashboard'

export const Route = createFileRoute('/rooms')({ component: RoomsLayout })

/**
 * Phone / small tablet: card grid, then a full room page.
 * Landscape tablet (>= 1200px, see ROOMS_SPLIT_QUERY): room list beside the open room, so
 * switching rooms is one tap. 1200 rather than 1280 leaves margin for 1280px-wide tablets that
 * report a slightly narrower viewport.
 */
function RoomsLayout() {
  const params = useParams({ strict: false }) as { areaId?: string }

  return (
    <div className="min-[1200px]:grid min-[1200px]:grid-cols-[16rem_minmax(0,1fr)] min-[1200px]:items-start min-[1200px]:gap-8">
      <aside className="hidden min-[1200px]:sticky min-[1200px]:top-8 min-[1200px]:grid min-[1200px]:gap-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-display text-3xl text-ink walnut:font-light">Rooms</h2>
          <AllLightsOff />
        </div>
        <nav aria-label="Rooms" className="flex flex-col gap-1">
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
