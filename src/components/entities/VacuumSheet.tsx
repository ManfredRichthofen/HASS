import { useMemo } from 'react'
import { useEntity, useServiceCall, useVacuum } from 'hass-react'
import { Battery, Home, Map as MapIcon, Play, Square } from 'lucide-react'
import { entities } from '#/config/dashboard'
import { VacuumMap } from '#/components/entities/VacuumMap'
import { Button } from '#/components/ui/button'
import { notify } from '#/components/ui/toast'
import { useVacuumDevice } from '#/hooks/useVacuumDevice'
import { cn } from '#/lib/cn'

const MODE_LABELS: Record<string, string> = {
  sweeping: 'Vacuum only',
  mopping: 'Mop only',
  sweeping_and_mopping: 'Vac + mop',
  mopping_after_sweeping: 'Vac then mop',
  off: 'Off',
  unavailable: 'Off',
  routine_cleaning: 'Routine',
  daily_cleaning: 'Daily',
  deep_cleaning: 'Deep',
  standardized: 'Standard',
}

function modeLabel(value: string) {
  const key = value.trim().toLowerCase().replace(/\s+/g, '_')
  if (MODE_LABELS[key]) return MODE_LABELS[key]
  if (MODE_LABELS[value]) return MODE_LABELS[value]
  return value.replace(/_/g, ' ')
}

function findSelect(
  selects: { entity_id: string; state: string }[],
  suffixes: string[],
) {
  for (const suffix of suffixes) {
    const match = selects.find((s) => s.entity_id.endsWith(`_${suffix}`))
    if (match && match.state !== 'unavailable') return match.entity_id
  }
  return null
}

function ModeChips({
  entityId,
  title,
}: {
  entityId: string
  title: string
}) {
  const entity = useEntity<{ options?: string[] }>(entityId)
  const { callService } = useServiceCall()
  const options = entity.attributes.options ?? []
  const current = String(entity.state ?? '')
  const disabled = entity.isUnavailable || options.length === 0

  async function select(option: string) {
    try {
      await callService('select', 'select_option', {
        entity_id: entityId,
        option,
      })
    } catch (e) {
      notify('Mode failed', e instanceof Error ? e.message : 'Error')
    }
  }

  if (disabled && options.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected =
            current.trim().toLowerCase() === option.trim().toLowerCase()
          return (
            <button
              key={option}
              type="button"
              disabled={entity.isUnavailable}
              onClick={() => void select(option)}
              className={cn(
                'touch-target rounded-xl border px-3 text-xs font-medium capitalize transition',
                selected
                  ? 'border-accent/40 bg-accent-soft text-accent'
                  : 'border-border-subtle bg-canvas text-ink-muted hover:text-ink',
              )}
            >
              {modeLabel(option)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function VacuumSheet({ entityId }: { entityId: string }) {
  const vacuum = useVacuum(entityId)
  const device = useVacuumDevice(entityId, entities.vacuumMapCameras)
  const unavailable = vacuum.isUnavailable

  const status = unavailable
    ? 'Unavailable'
    : vacuum.isDocked
      ? 'Docked'
      : vacuum.isCleaning
        ? 'Cleaning'
        : vacuum.isReturning
          ? 'Returning'
          : (vacuum.status ?? vacuum.state)

  const cleaningModeId = useMemo(
    () =>
      findSelect(device.selects, ['cleaning_mode']) ??
      entities.vacuumCleaningMode,
    [device.selects],
  )
  const cleanGeniusId = useMemo(
    () =>
      findSelect(device.selects, ['cleangenius', 'clean_genius']) ??
      entities.vacuumCleanGenius,
    [device.selects],
  )
  const cleanGeniusModeId = useMemo(
    () => findSelect(device.selects, ['cleangenius_mode']),
    [device.selects],
  )

  async function run(action: () => Promise<void>, label: string) {
    try {
      await action()
    } catch (e) {
      notify(label, e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="space-y-4 pb-1">
      <div className="flex items-center gap-2.5 text-sm">
        <span className="capitalize text-ink">{status}</span>
        {vacuum.batteryLevel != null ? (
          <>
            <span className="text-ink-faint">·</span>
            <span className="inline-flex items-center gap-1 tabular-nums text-ink-muted">
              <Battery className="size-3.5 text-success" />
              {vacuum.batteryLevel}%
            </span>
          </>
        ) : null}
      </div>

      {device.mapCameraId ? (
        <VacuumMap cameraId={device.mapCameraId} />
      ) : (
        <div className="grid place-items-center gap-1 rounded-2xl bg-canvas py-12 text-ink-faint">
          <MapIcon className="size-6 opacity-40" />
          <p className="text-xs">
            {device.loading ? 'Loading map…' : 'No map camera'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Button
          size="md"
          variant="accent"
          className="w-full gap-1.5"
          disabled={unavailable || vacuum.isCleaning}
          onClick={() => void run(() => vacuum.start(), 'Start failed')}
        >
          <Play className="size-4 shrink-0" /> Start
        </Button>
        <Button
          size="md"
          variant="secondary"
          className="w-full gap-1.5"
          disabled={unavailable}
          onClick={() => void run(() => vacuum.stop(), 'Stop failed')}
        >
          <Square className="size-4 shrink-0" /> Stop
        </Button>
        <Button
          size="md"
          variant="secondary"
          className="w-full gap-1.5"
          disabled={unavailable}
          onClick={() => void run(() => vacuum.returnToBase(), 'Dock failed')}
        >
          <Home className="size-4 shrink-0" /> Dock
        </Button>
      </div>

      <div className="space-y-3.5">
        {cleaningModeId ? (
          <ModeChips entityId={cleaningModeId} title="Mode" />
        ) : null}
        {cleanGeniusId ? (
          <ModeChips entityId={cleanGeniusId} title="CleanGenius" />
        ) : null}
        {cleanGeniusModeId ? (
          <ModeChips entityId={cleanGeniusModeId} title="CleanGenius level" />
        ) : null}
      </div>
    </div>
  )
}
