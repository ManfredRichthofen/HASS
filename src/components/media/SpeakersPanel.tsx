import { ArrowRightLeft, Check, Pause, Play, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Slider } from '#/components/ui/slider'
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
    <div className="grid gap-6">
      {others.length > 0 ? (
        <section className="grid gap-2" aria-label="Also playing">
          <span className="text-label">Also playing</span>
          {others.map((s) => (
            <OtherSession key={s.leader} session={s} onControl={() => onControl(s.leader)} />
          ))}
        </section>
      ) : null}

      <section className="grid gap-2" aria-label="Rooms">
        <div className="flex min-h-9 items-center justify-between gap-3">
          <span className="text-label">
            Selected · {current.members.length} of {rooms.length}
          </span>
          {rooms.length > 1 ? (
            <button
              type="button"
              onClick={() => (allSelected ? clear() : void actions.selectAll(current.leader))}
              className="min-h-9 text-sm font-semibold text-ink-muted transition-ui hover:text-ink brutal:font-label brutal:text-xs brutal:uppercase brutal:underline"
            >
              {allSelected ? 'Clear' : 'Select all'}
            </button>
          ) : null}
        </div>
        <div className="grid gap-2 brutal:gap-0">
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
      className="flex min-h-14 items-center gap-3 rounded-control border-ui border-border-subtle bg-surface px-3 text-left shadow-card transition-state modern:border-transparent brutal:border-ink brutal:shadow-none"
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
      <span className="shrink-0 pr-1 text-sm font-semibold text-ink-muted brutal:font-label brutal:text-xs brutal:uppercase">
        Control
      </span>
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
    ? 'Add another speaker to switch'
    : on
      ? null
      : otherTitle
        ? `Playing ${otherTitle}`
        : room.state === 'idle'
          ? 'Off'
          : null

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
        'grid gap-x-3 rounded-control border-ui border-border-subtle transition-state',
        on && 'border-transparent bg-surface shadow-card',
        'modern:border-transparent',
        'brutal:border-ink brutal:shadow-none brutal:not-first:-mt-0.5',
        on && 'brutal:bg-surface',
        room.unavailable && 'opacity-45',
      )}
    >
      <div className="flex min-h-14 items-center gap-1 pr-1.5">
        {/* biome-ignore lint/a11y/useSemanticElements: styled row toggle */}
        <button
          type="button"
          role="checkbox"
          aria-checked={on}
          aria-label={room.label}
          aria-disabled={locked || undefined}
          disabled={room.unavailable}
          onClick={toggle}
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 pl-2.5 text-left"
        >
          <span
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-pill border-2 border-border-strong text-ink-muted transition-state',
              on && 'border-accent bg-accent text-on-accent',
              locked && 'opacity-60',
              on && 'brutal:border-ink brutal:bg-ink brutal:text-on-from',
            )}
          >
            {on ? <Check className="size-4" /> : <Plus className="size-4" />}
          </span>
          <span className="min-w-0">
            <span
              className={cn(
                'block truncate text-[0.9375rem]',
                on ? 'font-semibold text-ink' : 'font-medium text-ink-muted',
              )}
            >
              {room.label}
            </span>
            {status ? (
              <span className="block truncate text-[0.8125rem] text-ink-faint brutal:font-label brutal:text-xs">
                {status}
              </span>
            ) : null}
          </span>
        </button>

        {playing && !on ? (
          <button
            type="button"
            onClick={() => void actions.moveTo(current.leader, room.id)}
            disabled={room.unavailable}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-pill px-3 text-sm font-semibold text-ink-muted transition-ui hover:bg-surface-hover hover:text-ink brutal:rounded-none brutal:font-label brutal:text-xs brutal:uppercase"
            aria-label={`Move the music to ${room.label}`}
          >
            <ArrowRightLeft className="size-3.5" />
            Move here
          </button>
        ) : null}
      </div>

      {on ? (
        <div className="-mt-2 pr-4 pl-[3.25rem]">
          <Slider
            size="thin"
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
        </div>
      ) : null}
    </div>
  )
}
