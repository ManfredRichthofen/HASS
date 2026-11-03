import {
  Car,
  ChevronLeft,
  ChevronRight,
  Film,
  ImageIcon,
  Loader2,
  type LucideIcon,
  Package,
  PawPrint,
  Radio,
  User,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrigateEvents } from '#/hooks/useFrigateEvents'
import { cn } from '#/lib/cn'
import {
  dayLabel,
  eventDayKey,
  eventDuration,
  eventLabel,
  eventScore,
  type FrigateEvent,
  formatEventClock,
  frigateClipUrl,
  frigatePreviewUrl,
  frigateSnapshotUrl,
  frigateThumbnailUrl,
} from '#/lib/frigate'

type Props = {
  camera: string
  instanceId: string
  active: boolean
  /** Fired when the visitor starts browsing, so the host can stop auto-closing. */
  onInteract?: () => void
}

const PAGE = 24
const VEHICLES = new Set(['car', 'truck', 'motorcycle', 'bicycle', 'bus'])
const ANIMALS = new Set(['dog', 'cat', 'bird', 'horse', 'bear', 'deer', 'squirrel', 'rabbit'])

function labelIcon(label: string): LucideIcon {
  if (label === 'person') return User
  if (VEHICLES.has(label)) return Car
  if (ANIMALS.has(label)) return PawPrint
  if (label === 'package') return Package
  return Radio
}

const typeOrder = (label: string) =>
  label === 'person' ? 0 : VEHICLES.has(label) ? 1 : ANIMALS.has(label) ? 2 : 3

export function DoorbellEventViewer({ camera, instanceId, active, onInteract }: Props) {
  const { events, loading, error, resolvedInstanceId } = useFrigateEvents({
    camera,
    instanceId,
    enabled: active,
    limit: 200,
    hours: 24 * 7,
    refetchIntervalMs: 15_000,
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<'snapshot' | 'clip'>('snapshot')
  const [type, setType] = useState<string | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [shown, setShown] = useState(PAGE)
  const detailRef = useRef<HTMLDivElement>(null)
  const mediaInstance = resolvedInstanceId || instanceId

  // Types and days that actually exist, with counts. Each chip's count respects
  // the *other* filter so a chip never promises events it can't show.
  const types = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of events) {
      if (day && eventDayKey(e.start_time) !== day) continue
      counts.set(e.label, (counts.get(e.label) ?? 0) + 1)
    }
    return [...counts.entries()].sort(
      (a, b) => typeOrder(a[0]) - typeOrder(b[0]) || b[1] - a[1],
    )
  }, [events, day])

  const days = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of events) {
      if (type && e.label !== type) continue
      const key = eventDayKey(e.start_time)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [events, type])

  const filtered = useMemo(
    () =>
      events
        .filter((e) => (!type || e.label === type) && (!day || eventDayKey(e.start_time) === day))
        .sort((a, b) => b.start_time - a.start_time),
    [events, type, day],
  )

  const visible = filtered.slice(0, shown)
  const groups = useMemo(() => {
    const out: { key: string; items: FrigateEvent[] }[] = []
    for (const e of visible) {
      const key = eventDayKey(e.start_time)
      const last = out[out.length - 1]
      if (last?.key === key) last.items.push(e)
      else out.push({ key, items: [e] })
    }
    return out
  }, [visible])

  useEffect(() => {
    if (!active) {
      setSelectedId(null)
      setMode('snapshot')
      setType(null)
      setDay(null)
      setShown(PAGE)
    }
  }, [active])

  // Keep a valid selection as filters / data change.
  useEffect(() => {
    if (!active) return
    if (!filtered.some((e) => e.id === selectedId)) setSelectedId(filtered[0]?.id ?? null)
  }, [active, filtered, selectedId])

  // A chosen filter can vanish when data refreshes; fall back to All.
  useEffect(() => {
    if (type && events.length > 0 && !events.some((e) => e.label === type)) setType(null)
    if (day && events.length > 0 && !events.some((e) => eventDayKey(e.start_time) === day))
      setDay(null)
  }, [events, type, day])

  const index = filtered.findIndex((e) => e.id === selectedId)
  const selected = index >= 0 ? filtered[index] : null

  const select = (id: string, scroll = false) => {
    onInteract?.()
    setSelectedId(id)
    const next = filtered.find((e) => e.id === id)
    if (next && !next.has_clip) setMode('snapshot')
    if (scroll) {
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      detailRef.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'nearest' })
    }
  }

  const step = (dir: -1 | 1) => {
    const next = filtered[index + dir]
    if (next) select(next.id, true)
  }

  const pickType = (next: string | null) => {
    onInteract?.()
    setType(next)
    setShown(PAGE)
  }
  const pickDay = (next: string | null) => {
    onInteract?.()
    setDay(next)
    setShown(PAGE)
  }

  const hasFilters = type != null || day != null

  return (
    <div className="@container mt-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Activity</h3>
        <span className="flex items-center gap-2 text-[0.8125rem] text-ink-muted tabular-nums">
          {loading ? (
            <Loader2
              role="status"
              aria-label="Loading activity"
              className="size-3.5 animate-spin text-ink-faint"
            />
          ) : null}
          {events.length > 0
            ? `${filtered.length} ${filtered.length === 1 ? 'event' : 'events'}${hasFilters ? ` of ${events.length}` : ''}`
            : null}
        </span>
      </div>

      {error ? (
        <p className="rounded-control border border-border-subtle bg-canvas px-3 py-2 text-[0.8125rem] text-danger">
          Couldn’t load doorbell activity. Try again in a moment.
        </p>
      ) : null}

      {!error && !loading && events.length === 0 ? (
        <p className="rounded-control border border-border-subtle bg-canvas px-3 py-2 text-[0.8125rem] text-ink-muted">
          No doorbell activity in the last 7 days.
        </p>
      ) : null}

      {events.length > 0 ? (
        <>
          {selected ? (
            <div ref={detailRef} className="scroll-mt-2">
              <EventDetail
                event={selected}
                instanceId={mediaInstance}
                mode={mode}
                onModeChange={(next) => {
                  onInteract?.()
                  setMode(next)
                }}
                position={index + 1}
                total={filtered.length}
                onPrev={index > 0 ? () => step(-1) : undefined}
                onNext={index < filtered.length - 1 ? () => step(1) : undefined}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <ChipRow label="Filter by day">
              <Chip active={day == null} onClick={() => pickDay(null)}>
                All days
              </Chip>
              {days.map(([key, count]) => (
                <Chip key={key} active={day === key} count={count} onClick={() => pickDay(key)}>
                  {dayLabel(key)}
                </Chip>
              ))}
            </ChipRow>
            <ChipRow label="Filter by type">
              <Chip active={type == null} onClick={() => pickType(null)}>
                Everything
              </Chip>
              {types.map(([label, count]) => (
                <Chip
                  key={label}
                  active={type === label}
                  count={count}
                  icon={labelIcon(label)}
                  onClick={() => pickType(label)}
                >
                  <span className="capitalize">{label.replace(/_/g, ' ')}</span>
                </Chip>
              ))}
            </ChipRow>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-card border border-border-subtle bg-canvas px-4 py-6 text-center">
              <p className="text-sm font-semibold text-ink">
                No {type ? `${type.replace(/_/g, ' ')} events` : 'events'}
                {day ? ` on ${dayLabel(day, 'long')}` : ''}
              </p>
              <button
                type="button"
                onClick={() => {
                  pickType(null)
                  pickDay(null)
                }}
                className="press mt-2 min-h-11 rounded-pill px-4 text-sm font-semibold text-accent hover:bg-surface-hover"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <section key={group.key} aria-label={dayLabel(group.key, 'long')}>
                  {day ? null : (
                    <h4 className="mb-2 flex items-baseline justify-between text-[0.8125rem] font-semibold text-ink-muted">
                      <span>{dayLabel(group.key, 'long')}</span>
                    </h4>
                  )}
                  <ul className="grid grid-cols-3 gap-2 @md:grid-cols-4 @xl:grid-cols-5">
                    {group.items.map((event) => (
                      <li key={event.id}>
                        <EventThumb
                          event={event}
                          instanceId={mediaInstance}
                          selected={selected?.id === event.id}
                          onSelect={() => select(event.id, true)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              {filtered.length > shown ? (
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE)}
                  className="press min-h-11 w-full rounded-pill border-ui border-border text-sm font-semibold text-ink-muted transition-ui hover:bg-surface-hover hover:text-ink"
                >
                  Show {Math.min(PAGE, filtered.length - shown)} more
                </button>
              ) : null}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]"
    >
      {children}
    </div>
  )
}

function Chip({
  active,
  count,
  icon: Icon,
  onClick,
  children,
}: {
  active: boolean
  count?: number
  icon?: LucideIcon
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-pill px-3.5 text-sm font-semibold whitespace-nowrap transition-ui',
        active
          ? 'bg-accent text-on-accent'
          : 'border-ui border-border text-ink-muted hover:bg-surface-hover hover:text-ink',
      )}
    >
      {Icon ? <Icon className="size-4" /> : null}
      {children}
      {count != null ? (
        <span className={cn('text-[0.8125rem] tabular-nums', active ? 'opacity-70' : 'text-ink-faint')}>
          {count}
        </span>
      ) : null}
    </button>
  )
}

function EventThumb({
  event,
  instanceId,
  selected,
  onSelect,
}: {
  event: FrigateEvent
  instanceId: string
  selected: boolean
  onSelect: () => void
}) {
  const Icon = labelIcon(event.label)
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${eventLabel(event)}, ${formatEventClock(event.start_time)}`}
      className={cn(
        'group block w-full overflow-hidden rounded-control border text-left transition-ui',
        selected
          ? 'border-accent bg-accent-soft'
          : 'border-border-subtle bg-canvas hover:border-border hover:bg-surface-hover',
      )}
    >
      <div className="relative aspect-4/3 bg-canvas">
        <img
          src={frigateThumbnailUrl(event.id, instanceId)}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
        {event.has_clip ? (
          <span className="absolute right-1 bottom-1 rounded bg-canvas/80 p-0.5 text-ink">
            <Film className="size-3" />
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <Icon className="size-3.5 shrink-0 text-ink-muted" />
        <span className="truncate text-[0.8125rem] font-semibold text-ink tabular-nums">
          {formatEventClock(event.start_time)}
        </span>
      </div>
    </button>
  )
}

function EventDetail({
  event,
  instanceId,
  mode,
  onModeChange,
  position,
  total,
  onPrev,
  onNext,
}: {
  event: FrigateEvent
  instanceId: string
  mode: 'snapshot' | 'clip'
  onModeChange: (mode: 'snapshot' | 'clip') => void
  position: number
  total: number
  onPrev?: () => void
  onNext?: () => void
}) {
  const score = eventScore(event)
  const showClip = mode === 'clip' && event.has_clip
  const seconds = eventDuration(event)
  const meta = [
    `${dayLabel(eventDayKey(event.start_time))}, ${formatEventClock(event.start_time)}`,
    seconds != null ? `${seconds}s` : null,
    score != null ? `${score}%` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="overflow-hidden rounded-card border border-border-subtle bg-canvas">
      <p className="sr-only" aria-live="polite">
        {`${eventLabel(event)}, ${meta}, ${position} of ${total}`}
      </p>
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold capitalize text-ink">{eventLabel(event)}</p>
          <p className="truncate text-[0.8125rem] text-ink-muted tabular-nums">{meta}</p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-control border-ui border-border-subtle bg-surface p-0.5 shadow-card modern:border-transparent">
          <ModeChip
            active={mode === 'snapshot'}
            disabled={!event.has_snapshot && !event.has_clip}
            icon={ImageIcon}
            label="Still"
            onClick={() => onModeChange('snapshot')}
          />
          <ModeChip
            active={mode === 'clip'}
            disabled={!event.has_clip}
            icon={Film}
            label="Clip"
            onClick={() => onModeChange('clip')}
          />
        </div>
      </div>

      <div className="relative aspect-video bg-black/40">
        {showClip ? (
          <video
            key={`${event.id}-clip`}
            src={frigateClipUrl(event.id, instanceId)}
            className="size-full object-contain"
            controls
            playsInline
            autoPlay
            muted
            poster={frigateSnapshotUrl(event.id, instanceId)}
          />
        ) : event.has_snapshot ? (
          <img
            key={`${event.id}-snap`}
            src={frigateSnapshotUrl(event.id, instanceId)}
            alt={eventLabel(event)}
            className="size-full object-contain"
          />
        ) : (
          <img
            key={`${event.id}-preview`}
            src={frigatePreviewUrl(event.id, instanceId)}
            alt={eventLabel(event)}
            className="size-full object-contain"
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border-subtle px-2 py-1.5">
        <StepButton label="Newer event" disabled={!onPrev} onClick={onPrev}>
          <ChevronLeft className="size-5" />
        </StepButton>
        <span className="text-[0.8125rem] text-ink-muted tabular-nums">
          {position} of {total}
        </span>
        <StepButton label="Older event" disabled={!onNext} onClick={onNext}>
          <ChevronRight className="size-5" />
        </StepButton>
      </div>
    </div>
  )
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="press grid size-11 place-items-center rounded-control text-ink transition-ui hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  )
}

function ModeChip({
  active,
  disabled,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  disabled?: boolean
  icon: typeof ImageIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-control px-3.5 text-[0.8125rem] font-semibold transition-ui',
        active ? 'bg-accent text-on-accent' : 'text-ink-muted hover:text-ink',
        disabled && 'pointer-events-none opacity-35',
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}
