import { useVacuum } from 'hass-react'
import { Home, Play, Square } from 'lucide-react'
import { entityName } from '#/lib/entityName'
import { cn } from '#/lib/cn'
import { Button } from '#/components/ui/button'
import { notify } from '#/components/ui/toast'

export function VacuumTile({ entityId }: { entityId: string }) {
  const vacuum = useVacuum(entityId)
  const name = entityName(entityId, vacuum.attributes.friendly_name)
  const unavailable = vacuum.isUnavailable

  async function run(action: () => Promise<void>, label: string) {
    try {
      await action()
    } catch (e) {
      notify(label, e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div
      className={cn(
        'rounded-3xl border border-border-subtle bg-surface p-4',
        unavailable && 'opacity-40',
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">{name}</p>
          <p className="text-xs text-ink-muted capitalize">
            {unavailable ? 'Unavailable' : vacuum.state}
            {vacuum.batteryLevel != null ? ` · ${vacuum.batteryLevel}%` : ''}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="accent"
          disabled={unavailable || vacuum.isCleaning}
          onClick={() => void run(() => vacuum.start(), 'Start failed')}
        >
          <Play className="size-4" /> Start
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={unavailable}
          onClick={() => void run(() => vacuum.stop(), 'Stop failed')}
        >
          <Square className="size-4" /> Stop
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={unavailable}
          onClick={() => void run(() => vacuum.returnToBase(), 'Dock failed')}
        >
          <Home className="size-4" /> Dock
        </Button>
      </div>
    </div>
  )
}
