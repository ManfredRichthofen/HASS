import { ArrowRightLeft, Pause, Play, Volume1 } from 'lucide-react'
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
              className="min-h-9 text-sm font-semibold text-ink-muted transition-ui hover:text-ink"
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
  const playing = current.state !== 'idle'
  const inSession = current.members.includes(room.id)
  const { value: on, commit } = useOptimisticValue(inSession)
  const [volume, setVolume] = useState(room.volume)
  useEffect(() => setVolume(room.volume), [room.volume])
  // Something has to play the music: the last selected speaker stays on.
  const locked = on && current.members.length === 1

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

  function toggle() {
    if (locked) return
    if (!on) {
      commit(true, () => actions.add(current.leader, room.id))
    } else if (room.id === current.leader) {
      // The main speaker leaves: the music carries on from the next one.
      commit(false, async () => {
        const next = await actions.dropLeader(current.members, playing)
        if (next) onFollow(next)
      })
    } else {
      commit(false, () => actions.remove(room.id))
    }
  }

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
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-[0.9375rem]',
              on ? 'font-semibold text-ink' : 'font-medium text-ink-muted',
            )}
          >
            {room.label}
          </p>
          <p className="truncate text-[0.8125rem] text-ink-faint">{status}</p>
        </div>

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
