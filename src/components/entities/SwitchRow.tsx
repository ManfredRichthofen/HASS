import { useSwitch } from 'hass-react'
import { entityName } from '#/lib/entityName'
import { cn } from '#/lib/cn'
import { Switch } from '#/components/ui/switch'
import { notify } from '#/components/ui/toast'

export function SwitchRow({
  entityId,
  label,
  showToggle = true,
}: {
  entityId: string
  label?: string
  /** Set false for read-only status rows that should not look controllable. */
  showToggle?: boolean
}) {
  const sw = useSwitch(entityId)
  const name =
    label ??
    entityName(
      entityId,
      (sw.attributes as { friendly_name?: string }).friendly_name,
    )

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface px-4 py-3',
        sw.isUnavailable && 'opacity-40',
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{name}</p>
        <p className="text-xs text-ink-muted">
          {sw.isUnavailable ? 'Unavailable' : sw.isOn ? 'On' : 'Off'}
        </p>
      </div>
      {showToggle ? (
        <Switch
          checked={sw.isOn}
          disabled={sw.isUnavailable}
          onCheckedChange={() => {
            void sw.toggle().catch((e) =>
              notify('Switch failed', e instanceof Error ? e.message : 'Error'),
            )
          }}
        />
      ) : null}
    </div>
  )
}
