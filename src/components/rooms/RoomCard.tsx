import { Link } from '@tanstack/react-router'
import { useSensor } from 'hass-react'
import { Power } from 'lucide-react'
import { useRoom } from '#/components/rooms/useRoom'
import type { AreaConfig } from '#/config/dashboard'
import { cn } from '#/lib/cn'
import { m, snappy, staggerItem, tap } from '#/lib/motion'

function RoomTemp({ entityId }: { entityId: string }) {
  const temp = useSensor(entityId)
  if (temp.isUnavailable || temp.numericValue == null) return null
  return <>{Math.round(temp.numericValue)}°</>
}

/**
 * A room on the Rooms page: its name large, a short sentence, a lamp dot per
 * light and the temperature. A lit room glows from the corner (Modern: a
 * single amber dot; Brutalist: a yellow bar across the top).
 */
export function RoomCard({ area }: { area: AreaConfig }) {
  const room = useRoom(area)
  const { Icon } = room

  return (
    <m.div
      variants={staggerItem}
      whileTap={tap.medium}
      transition={snappy}
      className={cn(
        'card relative flex min-h-44 flex-col justify-between gap-7 overflow-hidden p-4.5',
        'brutal:border-ink',
      )}
    >
      {/* Lit glow / dot / bar */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-slow',
          'bg-[radial-gradient(120%_90%_at_100%_0%,var(--c-light-soft),transparent_65%)]',
          'modern:inset-auto modern:top-4.5 modern:right-4.5 modern:size-2.5 modern:rounded-pill modern:bg-none modern:bg-on-to modern:shadow-[0_0_0_4px_var(--c-light-soft)]',
          'brutal:inset-x-0 brutal:top-0 brutal:bottom-auto brutal:h-2.5 brutal:border-b-2 brutal:border-ink brutal:bg-none brutal:bg-on-from',
          room.isLit && 'opacity-100',
        )}
      />
      <Link
        to="/rooms/$areaId"
        params={{ areaId: area.id }}
        aria-label={`Open ${area.name}`}
        className="absolute inset-0 z-[1]"
      />
      <div className="relative flex items-start justify-between gap-3 text-ink-faint brutal:pt-1.5">
        <Icon className="size-[22px] modern:hidden" />
        <span className="text-display text-xl leading-none text-ink-muted tabular-nums modern:order-first modern:text-[2rem] modern:text-ink modern:tracking-[-0.04em] modern:pr-6">
          {room.tempId ? <RoomTemp entityId={room.tempId} /> : null}
        </span>
      </div>
      <div className="relative flex items-end justify-between gap-3">
        <div className="grid min-w-0 gap-2">
          {room.hasLights ? (
            <div className="flex gap-1.5 modern:hidden" aria-hidden>
              {room.lit.map((on, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: one dot per light, fixed order
                  key={i}
                  className={cn(
                    'size-2 rounded-pill bg-border',
                    on && 'bg-light shadow-[0_0_0_3px_var(--c-light-soft)]',
                    'brutal:size-2.5 brutal:border-2 brutal:border-ink brutal:bg-transparent',
                    on && 'brutal:bg-ink brutal:shadow-none',
                  )}
                />
              ))}
            </div>
          ) : null}
          <p className="text-display truncate text-2xl leading-tight text-ink walnut:text-[1.75rem] walnut:font-light">
            {area.name}
          </p>
          <p className="truncate text-[0.8125rem] text-ink-muted brutal:font-label brutal:text-xs">
            {room.summary}
          </p>
        </div>
        {room.hasLights ? (
          <button
            type="button"
            onClick={() => void room.togglePower()}
            aria-label={`${room.isLit ? 'Turn off' : 'Turn on'} ${area.name} lights`}
            className={cn(
              'press relative z-[2] -mr-1 -mb-1 grid size-11 shrink-0 place-items-center rounded-pill text-ink-muted transition-state hover:text-ink',
              room.isLit ? 'bg-on shadow-on text-on-ink hover:text-on-ink' : 'bg-icon-well',
              'brutal:border-2 brutal:border-ink',
            )}
          >
            <Power className="size-5" />
          </button>
        ) : null}
      </div>
    </m.div>
  )
}
