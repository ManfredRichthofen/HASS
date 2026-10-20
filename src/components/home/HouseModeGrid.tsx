import { useEntity, useServiceCall } from 'hass-react'
import { notify } from '#/components/ui/toast'
import { entities } from '#/config/dashboard'
import { cn } from '#/lib/cn'
import { m, snappy, tap } from '#/lib/motion'

function modeMatches(current: string, label: string) {
  return current.trim().toLowerCase() === label.trim().toLowerCase()
}

export function HouseModeGrid() {
  const mode = useEntity(entities.houseMode)
  const { callService } = useServiceCall()
  const current = String(mode.state ?? '')

  async function runScript(entityId: string, label: string) {
    try {
      await callService('script', 'turn_on', { entity_id: entityId })
      notify(label)
    } catch (e) {
      notify('Failed', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {entities.houseModes.map((item) => {
        const selected = modeMatches(current, item.label)
        return (
          <m.button
            key={item.id}
            type="button"
            whileTap={tap.medium}
            transition={snappy}
            onClick={() => void runScript(item.id, item.label)}
            className={cn(
              'touch-target flex items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-ui',
              selected
                ? 'border-transparent bg-accent text-white'
                : 'border-border-subtle bg-surface text-ink hover:bg-surface-hover',
            )}
          >
            {item.label}
          </m.button>
        )
      })}
    </div>
  )
}
