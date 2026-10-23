import { Film, ImageIcon, Loader2, Radio } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFrigateEvents } from '#/hooks/useFrigateEvents'
import { cn } from '#/lib/cn'
import {
  eventLabel,
  eventScore,
  type FrigateEvent,
  formatEventRelative,
  frigateClipUrl,
  frigatePreviewUrl,
  frigateSnapshotUrl,
  frigateThumbnailUrl,
} from '#/lib/frigate'

type Props = {
  camera: string
  instanceId: string
  active: boolean
}

export function DoorbellEventViewer({ camera, instanceId, active }: Props) {
  const { events, loading, error, resolvedInstanceId } = useFrigateEvents({
    camera,
    instanceId,
    enabled: active,
    limit: 10,
    hours: 24,
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<'snapshot' | 'clip'>('snapshot')
  const mediaInstance = resolvedInstanceId || instanceId

  useEffect(() => {
    if (!active) {
      setSelectedId(null)
      setMode('snapshot')
      return
    }
    if (!selectedId && events[0]) setSelectedId(events[0].id)
  }, [active, events, selectedId])

  const selected = events.find((e) => e.id === selectedId) ?? events[0] ?? null

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <Radio className="size-4 text-accent" />
          <span>Event tracker</span>
        </div>
        {loading ? <Loader2 className="size-3.5 animate-spin text-ink-faint" /> : null}
      </div>

      {error ? (
        <p className="rounded-control border border-border-subtle bg-canvas px-3 py-2 text-xs text-danger">
          Couldn’t load Frigate events for <code className="text-ink">{camera}</code> (instance{' '}
          <code className="text-ink">{mediaInstance}</code>). {error}
        </p>
      ) : null}

      {!error && !loading && events.length === 0 ? (
        <p className="rounded-control border border-border-subtle bg-canvas px-3 py-2 text-xs text-ink-muted">
          No recent detections for <code className="text-ink">{camera}</code> (instance{' '}
          <code className="text-ink">{mediaInstance}</code>).
        </p>
      ) : null}

      {events.length > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {events.map((event) => (
            <EventThumb
              key={event.id}
              event={event}
              instanceId={mediaInstance}
              selected={selected?.id === event.id}
              onSelect={() => {
                setSelectedId(event.id)
                setMode(event.has_clip ? mode : 'snapshot')
              }}
            />
          ))}
        </div>
      ) : null}

      {selected ? (
        <EventDetail
          event={selected}
          instanceId={mediaInstance}
          mode={mode}
          onModeChange={setMode}
        />
      ) : null}
    </div>
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
  const score = eventScore(event)
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group w-[5.75rem] shrink-0 overflow-hidden rounded-control border text-left transition-ui',
        selected
          ? 'border-accent bg-accent-soft'
          : 'border-border-subtle bg-canvas hover:border-border hover:bg-surface-hover',
      )}
    >
      <div className="relative aspect-square bg-canvas">
        <img
          src={frigateThumbnailUrl(event.id, instanceId)}
          alt={eventLabel(event)}
          className="size-full object-cover"
          loading="lazy"
        />
        {event.has_clip ? (
          <span className="absolute right-1 bottom-1 rounded bg-canvas/80 p-0.5 text-ink">
            <Film className="size-3" />
          </span>
        ) : null}
      </div>
      <div className="space-y-0.5 px-1.5 py-1.5">
        <p className="truncate text-[0.65rem] font-semibold capitalize text-ink">
          {eventLabel(event)}
        </p>
        <p className="truncate text-[0.6rem] text-ink-faint">
          {formatEventRelative(event.start_time)}
          {score != null ? ` · ${score}%` : ''}
        </p>
      </div>
    </button>
  )
}

function EventDetail({
  event,
  instanceId,
  mode,
  onModeChange,
}: {
  event: FrigateEvent
  instanceId: string
  mode: 'snapshot' | 'clip'
  onModeChange: (mode: 'snapshot' | 'clip') => void
}) {
  const score = eventScore(event)
  const showClip = mode === 'clip' && event.has_clip

  return (
    <div className="overflow-hidden rounded-card border border-border-subtle bg-canvas">
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold capitalize text-ink">{eventLabel(event)}</p>
          <p className="truncate text-xs text-ink-muted">
            {formatEventRelative(event.start_time)}
            {score != null ? ` · ${score}%` : ''}
          </p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-control border-ui border-border-subtle bg-surface shadow-card modern:border-transparent p-0.5">
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
    </div>
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
        'inline-flex h-7 items-center gap-1 rounded-control px-2 text-[0.7rem] font-medium transition-ui',
        active ? 'bg-accent text-on-accent' : 'text-ink-muted hover:text-ink',
        disabled && 'pointer-events-none opacity-35',
      )}
    >
      <Icon className="size-3" />
      {label}
    </button>
  )
}
