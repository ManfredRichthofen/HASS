import { ArrowRightLeft, Check, Pause, Play, Plus, Volume1 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Slider } from '#/components/ui/slider'
import { Switch } from '#/components/ui/switch'
import {
  type MusicSession,
  type RoomInfo,
  useGroupActions,
  useMusicSessions,
} from '#/hooks/useMusicSessions'
import { useOptimisticValue } from '#/hooks/useOptimisticValue'
import { cn } from '#/lib/cn'
import { m, snappy, tap } from '#/lib/motion'

/**
 * Every grouping decision in one place:
 * - what else is playing (tap to control it instead),
 * - which speakers play together: tick to add, untick to remove — any time,
 *   playing or not (one speaker always stays selected),
 * - each speaker's volume, select all / clear, and moving the music elsewhere.
 */
export function SpeakersPanel({
  current,
  onControl,
  onFollow = onControl,
}: {
  current: MusicSession
  /** Control another session instead (pass its leader). */
  onControl: (id: string) => void
  /** Keep following the music when its main speaker changes, without leaving this panel. */
  onFollow?: (id: string) => void
}) {
  const { rooms, active } = useMusicSessions()
  const actions = useGroupActions()
  const others = active.filter((s) => s.leader !== current.leader)
  const allSelected = current.members.length === rooms.length
  const clear = () => {
    for (const id of current.members.slice(1)) void actions.remove(id)
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      {others.length > 0 ? (
        <section className="grid grid-cols-[minmax(0,1fr)] gap-2" aria-label="Also playing">
          <span className="text-label">Also playing</span>
          {others.map((s) => (
            <OtherSession key={s.leader} session={s} onControl={() => onControl(s.leader)} />
          ))}
        </section>
      ) : null}

      <section className="grid grid-cols-[minmax(0,1fr)] gap-2" aria-label="Playing in">
        <div className="flex min-h-9 items-center justify-between gap-3">
          <span className="text-label">Playing in</span>
          {rooms.length > 1 ? (
            <button
              type="button"
              onClick={() => (allSelected ? clear() : void actions.selectAll(current.leader))}
              className="touch-target inline-flex items-center text-sm font-semibold text-ink-muted transition-ui hover:text-ink"
            >
              {allSelected ? 'Just this one' : 'All rooms'}
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {rooms.map((room) => (
            <RoomRow
              key={room.id}
              room={room}
              current={current}
              otherTitle={
                room.leader !== current.leader && room.state !== 'idle'
                  ? (active.find((s) => s.leader === room.leader)?.title ?? 'Something else')
                  : null
              }
              onFollow={onFollow}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function OtherSession({ session, onControl }: { session: MusicSession; onControl: () => void }) {
  const Icon = session.state === 'playing' ? Play : Pause
  return (
    <m.button
      type="button"
      whileTap={tap.soft}
      transition={snappy}
      onClick={onControl}
      className="flex min-h-14 items-center gap-3 rounded-control border-ui border-border-subtle bg-surface px-3 text-left shadow-card transition-state modern:border-transparent"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-pill bg-surface-hover text-ink-muted">
        <Icon className="size-3.5 fill-current" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-semibold text-ink">
          {session.label}
        </span>
        <span className="block truncate text-[0.8125rem] text-ink-muted">
          {session.title ?? (session.state === 'playing' ? 'Playing' : 'Paused')}
        </span>
      </span>
      <span className="shrink-0 pr-1 text-sm font-semibold text-ink-muted">Control</span>
    </m.button>
  )
}

/**
 * Add a room to the music or take it out. The last room stays on (something has
 * to play), and taking out the main speaker hands the music to the next one.
 */
function useRoomToggle(
  room: RoomInfo,
  current: MusicSession,
  onFollow: (id: string) => void,
) {
  const actions = useGroupActions()
  const playing = current.state !== 'idle'
  const inSession = current.members.includes(room.id)
  const { value: on, commit } = useOptimisticValue(inSession)
  const locked = on && current.members.length === 1

  function toggle() {
    if (locked || room.unavailable) return
    if (!on) {
      commit(true, () => actions.add(current.leader, room.id))
    } else if (room.id === current.leader) {
      commit(false, async () => {
        const next = await actions.dropLeader(current.members, playing)
        if (next) onFollow(next)
      })
    } else {
      commit(false, () => actions.remove(room.id))
    }
  }

  return { on, locked, playing, toggle }
}

/**
 * "Plays in": the rooms as chips, for choosing speakers without leaving Search.
 * Same rules as the Speakers list: tap to add or remove, the last room stays on.
 */
export function RoomChips({
  current,
  onFollow,
}: {
  current: MusicSession
  onFollow: (id: string) => void
}) {
  const { rooms } = useMusicSessions()
  const actions = useGroupActions()
  const available = rooms.filter((r) => !r.unavailable)
  const everywhere = available.length > 1 && available.every((r) => current.members.includes(r.id))

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <span className="text-label" id="plays-in-label">
        Plays in
      </span>
      <div
        role="group"
        aria-labelledby="plays-in-label"
        className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5"
      >
        {rooms.map((room) => (
          <RoomChip key={room.id} room={room} current={current} onFollow={onFollow} />
        ))}
        {available.length > 1 && !everywhere ? (
          <button
            type="button"
            onClick={() => void actions.selectAll(current.leader)}
            className="press inline-flex h-11 shrink-0 items-center rounded-pill px-3.5 text-[0.8125rem] font-semibold text-ink-muted transition-ui hover:text-ink"
          >
            All rooms
          </button>
        ) : null}
      </div>
    </div>
  )
}

function RoomChip({
  room,
  current,
  onFollow,
}: {
  room: RoomInfo
  current: MusicSession
  onFollow: (id: string) => void
}) {
  const { on, locked, toggle } = useRoomToggle(room, current, onFollow)
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-disabled={locked || undefined}
      disabled={room.unavailable}
      title={locked ? 'Music needs at least one room' : undefined}
      onClick={toggle}
      className={cn(
        'press inline-flex h-11 shrink-0 items-center gap-1.5 rounded-pill border-ui px-3.5 text-[0.8125rem] font-semibold transition-state',
        on
          ? 'border-accent bg-accent text-on-accent'
          : 'border-border-subtle text-ink-muted hover:text-ink',
        room.unavailable && 'opacity-45',
      )}
    >
      {on ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
      {room.label}
    </button>
  )
}

function RoomRow({
  room,
  current,
  otherTitle,
  onFollow,
}: {
  room: RoomInfo
  current: MusicSession
  /** Set when this room is playing something else. */
  otherTitle: string | null
  onFollow: (id: string) => void
}) {
  const actions = useGroupActions()
  const { on, locked, playing, toggle } = useRoomToggle(room, current, onFollow)
  const [volume, setVolume] = useState(room.volume)
  useEffect(() => setVolume(room.volume), [room.volume])

  const status = locked
    ? 'Needs at least one room'
    : on
      ? playing
        ? 'Playing'
        : 'Selected'
      : otherTitle
        ? `Playing ${otherTitle}`
        : room.unavailable
          ? 'Unavailable'
          : 'Off'

  return (
    <div
      className={cn(
        'min-w-0 rounded-control border-ui border-border-subtle transition-state',
        on && 'border-transparent bg-surface shadow-card',
        'modern:border-transparent',
        room.unavailable && 'opacity-45',
      )}
    >
      <div className="flex min-h-16 items-center gap-2 pr-1 pl-4">
        {/* The whole name area is a big tap target for the switch beside it. */}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={toggle}
          disabled={room.unavailable || locked}
          className="min-h-14 min-w-0 flex-1 cursor-pointer self-stretch text-left disabled:cursor-default"
        >
          <span
            className={cn(
              'block truncate text-[0.9375rem]',
              on ? 'font-semibold text-ink' : 'font-medium text-ink-muted',
            )}
          >
            {room.label}
          </span>
          <span className="block truncate text-[0.8125rem] text-ink-faint">{status}</span>
        </button>

        {playing && !on ? (
          <button
            type="button"
            onClick={() => void actions.moveTo(current.leader, room.id)}
            disabled={room.unavailable}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-pill px-3 text-sm font-semibold text-ink-muted transition-ui hover:bg-surface-hover hover:text-ink"
            aria-label={`Move the music to ${room.label}`}
          >
            <ArrowRightLeft className="size-3.5" />
            Move
          </button>
        ) : null}

        <Switch
          aria-label={`Play in ${room.label}`}
          checked={on}
          disabled={room.unavailable || locked}
          onCheckedChange={toggle}
        />
      </div>

      {on ? (
        <div className="flex items-center gap-3 pr-4 pb-3 pl-4">
          <Volume1 className="size-[18px] shrink-0 text-ink-faint" aria-hidden />
          <Slider
            size="thin"
            className="min-w-0 flex-1"
            aria-label={`${room.label} volume`}
            min={0}
            max={100}
            step={1}
            value={volume}
            disabled={room.unavailable}
            onValueChange={(v) => setVolume(Array.isArray(v) ? (v[0] ?? 0) : v)}
            onValueCommitted={(v) => {
              const next = Array.isArray(v) ? (v[0] ?? 0) : v
              setVolume(next)
              void actions.volume(room.id, next)
            }}
          />
          <span className="w-8 shrink-0 text-right text-[0.8125rem] tabular-nums text-ink-muted">
            {volume}
          </span>
        </div>
      ) : null}
    </div>
  )
}
