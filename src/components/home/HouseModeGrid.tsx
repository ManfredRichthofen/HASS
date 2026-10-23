import { useEntity, useServiceCall } from 'hass-react'
import { notify } from '#/components/ui/toast'
import { entities } from '#/config/dashboard'
import { cn } from '#/lib/cn'

function modeMatches(current: string, label: string) {
  return current.trim().toLowerCase() === label.trim().toLowerCase()
}

/** The house modes as a list you read, not a grid of buttons. Selecting runs the mode's script. */
export function HouseModeGrid({ onPicked }: { onPicked?: () => void }) {
  const mode = useEntity(entities.houseMode)
  const { callService } = useServiceCall()
  const current = String(mode.state ?? '')

  async function runScript(entityId: string, label: string) {
    try {
      await callService('script', 'turn_on', { entity_id: entityId })
      notify(label)
      onPicked?.()
    } catch (e) {
      notify('Mode failed', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div role="radiogroup" aria-label="House mode" className="grid">
      {entities.houseModes.map((item) => {
        const selected = modeMatches(current, item.label)
        return (
          // biome-ignore lint/a11y/useSemanticElements: styled radio rows; a native radio cannot hold this layout
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => void runScript(item.id, item.label)}
            className={cn(
              'flex min-h-16 items-center justify-between gap-4 border-b border-border-subtle py-3 text-left last:border-b-0',
              'brutal:border-b-2 brutal:border-ink brutal:last:border-b-0',
            )}
          >
            <span className="text-display text-xl text-ink">{item.label}</span>
            <span
              aria-hidden
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-pill border-2 border-border-strong',
                selected && 'border-accent',
              )}
            >
              {selected ? <span className="size-3 rounded-pill bg-accent" /> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export const ModePicker = HouseModeGrid
