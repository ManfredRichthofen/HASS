import { Link } from '@tanstack/react-router'
import { useSensor } from 'hass-react'
import { Power } from 'lucide-react'
import { useRoom } from '#/components/rooms/useRoom'
import type { AreaConfig } from '#/config/dashboard'
import { useScrollSafePress } from '#/hooks/useScrollSafePress'
import { cn } from '#/lib/cn'

function Temp({ entityId }: { entityId: string }) {
  const temp = useSensor(entityId)
  if (temp.isUnavailable || temp.numericValue == null) return null
  return <span>{` · ${Math.round(temp.numericValue)}°`}</span>
}

/** Compact room row for the wide-tablet master list. */
export function RoomListItem({ area, active }: { area: AreaConfig; active: boolean }) {
  const room = useRoom(area)
  const { Icon } = room
  const powerPress = useScrollSafePress(room.togglePower)

  return (
    <div
      className={cn(
        'relative flex min-h-17 items-center gap-3.5 rounded-control border-ui border-transparent px-3 py-2.5 transition-state',
        active
          ? 'border-border-subtle bg-surface shadow-card modern:border-transparent'
          : 'hover:bg-surface/60',
      )}
    >
      <Link
        to="/rooms/$areaId"
        params={{ areaId: area.id }}
        aria-label={`Open ${area.name}`}
        aria-current={active ? 'page' : undefined}
        className="absolute inset-0 z-[1] rounded-control"
      />
      <span className="shrink-0 glass:grid glass:size-11 glass:place-items-center glass:rounded-pill glass:bg-raised glass:shadow-card">
        <Icon
          className={cn('size-[22px]', room.isLit ? 'text-light' : 'text-ink-faint')}
          aria-hidden
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-display truncate text-lg leading-tight">{area.name}</p>
        <p className={cn('truncate text-[0.8125rem] text-ink-muted')}>
          {room.summary}
          {room.tempId ? <Temp entityId={room.tempId} /> : null}
        </p>
      </div>
      {room.hasLights ? (
        <button
          type="button"
          {...powerPress}
          aria-label={`${room.isLit ? 'Turn off' : 'Turn on'} ${area.name} lights`}
          className={cn(
            'press relative z-[2] grid size-11 shrink-0 place-items-center rounded-pill text-ink-muted transition-state',
            room.isLit ? 'bg-on shadow-on text-on-ink' : 'bg-icon-well hover:text-ink',
          )}
        >
          <Power className="size-[18px]" />
        </button>
      ) : null}
    </div>
  )
}
