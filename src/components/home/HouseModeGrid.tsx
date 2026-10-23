import { useEntity, useServiceCall } from 'hass-react'
import { notify } from '#/components/ui/toast'
import { entities } from '#/config/dashboard'
import { useOptimisticValue } from '#/hooks/useOptimisticValue'
import { useScrollSafePress } from '#/hooks/useScrollSafePress'
import { cn } from '#/lib/cn'
import { LayoutGroup, m, snappy, tap } from '#/lib/motion'

function modeMatches(current: string, label: string) {
  return current.trim().toLowerCase() === label.trim().toLowerCase()
}

function ModeRow({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  const press = useScrollSafePress(onSelect)

  return (
    <m.button
      type="button"
      role="radio"
      aria-checked={selected}
      {...press}
      whileTap={tap.soft}
      transition={snappy}
      className={cn(
        'flex min-h-16 items-center justify-between gap-4 border-b border-border-subtle py-3 text-left last:border-b-0',
        '@xl:min-h-14 @xl:py-2.5',
        'brutal:border-b-2 brutal:border-ink brutal:last:border-b-0',
      )}
    >
      <span className="text-display text-xl text-ink">{label}</span>
      <span
        aria-hidden
        className={cn(
          'grid size-6 shrink-0 place-items-center rounded-pill border-2 border-border-strong transition-ui',
          selected && 'border-accent',
        )}
      >
        {selected ? (
          <m.span
            layoutId="house-mode-dot"
            transition={snappy}
            className="size-3 rounded-pill bg-accent"
          />
        ) : null}
      </span>
    </m.button>
  )
}

/** The house modes as a list you read, not a grid of buttons. Selecting runs the mode's script. */
export function HouseModeGrid({ onPicked }: { onPicked?: () => void }) {
  const mode = useEntity(entities.houseMode)
  const { callService } = useServiceCall()
  const server = String(mode.state ?? '')
  const { value: current, commit } = useOptimisticValue(server)

  const runScript = (entityId: string, label: string) => {
    commit(label, async () => {
      try {
        await callService('script', 'turn_on', { entity_id: entityId })
        notify(label)
        onPicked?.()
      } catch (e) {
        notify('Mode failed', e instanceof Error ? e.message : 'Error')
        throw e
      }
    })
  }

  return (
    <LayoutGroup id="house-mode">
      <div role="radiogroup" aria-label="House mode" className="grid">
        {entities.houseModes.map((item) => (
          <ModeRow
            key={item.id}
            label={item.label}
            selected={modeMatches(current, item.label)}
            onSelect={() => runScript(item.id, item.label)}
          />
        ))}
      </div>
    </LayoutGroup>
  )
}

export const ModePicker = HouseModeGrid
