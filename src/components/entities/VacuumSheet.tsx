import { useEntity, useServiceCall, useVacuum } from 'hass-react'
import { Home, Play, Square } from 'lucide-react'
import { useState } from 'react'
import { VacuumMap } from '#/components/entities/VacuumMap'
import { Button } from '#/components/ui/button'
import { notify } from '#/components/ui/toast'
import { entities } from '#/config/dashboard'
import { useOptimisticValue } from '#/hooks/useOptimisticValue'
import { cn } from '#/lib/cn'

/** Words for the options the Dreame integration reports. Unknown ones fall back to the raw name. */
const OPTION_LABELS: Record<string, string> = {
  off: 'Off',
  routine_cleaning: 'Routine',
  deep_cleaning: 'Deep',
  vacuum_and_mop: 'Vacuum and mop',
  mop_after_vacuum: 'Mop after vacuum',
  sweeping: 'Vacuum only',
  mopping: 'Mop only',
  sweeping_and_mopping: 'Vacuum and mop',
  mopping_after_sweeping: 'Mop after vacuum',
  daily_cleaning: 'Daily',
  standardized: 'Standard',
}

function optionLabel(value: string) {
  const key = value.trim().toLowerCase().replace(/\s+/g, '_')
  return OPTION_LABELS[key] ?? value.replace(/_/g, ' ')
}

/**
 * One select as a row of choices. Renders nothing while the select is offline:
 * the vacuum reports its classic mode selects as unavailable whenever CleanGenius
 * is in charge, and a row of one disabled "Off" chip would be noise.
 */
function ChoiceRow({ entityId, title }: { entityId: string; title: string }) {
  const entity = useEntity<{ options?: string[] }>(entityId)
  const { callService } = useServiceCall()
  const options = (entity.attributes.options ?? []).filter((o) => o !== 'unavailable')
  const { value: current, commit } = useOptimisticValue(String(entity.state ?? ''))

  if (entity.isUnavailable || options.length === 0) return null

  const select = (option: string) => {
    commit(option, async () => {
      try {
        await callService('select', 'select_option', { entity_id: entityId, option })
      } catch (e) {
        notify(`${title} didn’t change`, e instanceof Error ? e.message : 'Error')
        throw e
      }
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-[0.8125rem] font-semibold text-ink-muted">{title}</p>
      <div role="radiogroup" aria-label={title} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = current.trim().toLowerCase() === option.trim().toLowerCase()
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => select(option)}
              className={cn(
                'touch-target rounded-control border px-3.5 text-[0.8125rem] font-medium transition-ui',
                selected
                  ? 'border-accent bg-accent text-on-accent'
                  : 'border-border-subtle bg-canvas text-ink-muted hover:text-ink',
              )}
            >
              {optionLabel(option)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function VacuumSheet({ entityId }: { entityId: string }) {
  const vacuum = useVacuum(entityId)
  const unavailable = vacuum.isUnavailable
  const [busy, setBusy] = useState<string | null>(null)

  async function run(key: string, action: () => Promise<void>, failed: string) {
    setBusy(key)
    try {
      await action()
    } catch (e) {
      notify(failed, e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4 pb-1">
      <VacuumMap cameraId={entities.vacuumMapCamera} active={vacuum.isCleaning || vacuum.isReturning} />

      <div className="grid grid-cols-3 gap-2">
        <Button
          size="md"
          variant="accent"
          className="w-full gap-1.5"
          disabled={unavailable || vacuum.isCleaning || busy !== null}
          onClick={() => void run('start', () => vacuum.start(), 'Couldn’t start cleaning')}
        >
          <Play className="size-4 shrink-0" /> Start
        </Button>
        <Button
          size="md"
          variant="secondary"
          className="w-full gap-1.5"
          disabled={unavailable || vacuum.isDocked || busy !== null}
          onClick={() => void run('stop', () => vacuum.stop(), 'Couldn’t stop')}
        >
          <Square className="size-4 shrink-0" /> Stop
        </Button>
        <Button
          size="md"
          variant="secondary"
          className="w-full gap-1.5"
          disabled={unavailable || vacuum.isDocked || vacuum.isReturning || busy !== null}
          onClick={() => void run('dock', () => vacuum.returnToBase(), 'Couldn’t send it to the dock')}
        >
          <Home className="size-4 shrink-0" /> Dock
        </Button>
      </div>

      {/* CleanGenius first: it is what the vacuum runs on. The classic Mode row only appears when the vacuum reports it. */}
      <div className="space-y-3.5">
        <ChoiceRow entityId={entities.vacuumCleanGenius} title="CleanGenius" />
        <ChoiceRow entityId={entities.vacuumCleanGeniusMode} title="Cleaning style" />
        <ChoiceRow entityId={entities.vacuumCleaningMode} title="Mode" />
      </div>
    </div>
  )
}
