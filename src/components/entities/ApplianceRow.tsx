import { useSensor, useSwitch } from 'hass-react'
import { cn } from '#/lib/cn'
import { Switch } from '#/components/ui/switch'
import { notify } from '#/components/ui/toast'

/** Appliance power switch with its current cycle status underneath. */
export function ApplianceRow({
  powerId,
  statusId,
  label,
}: {
  powerId: string
  statusId: string
  label: string
}) {
  const status = useSensor(statusId)
  const power = useSwitch(powerId)
  const statusLabel = status.isUnavailable
    ? '—'
    : String(status.value ?? status.state).replace(/_/g, ' ')

  return (
    <div
      className={cn(
        'flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface px-3.5 py-2 sm:px-4',
        power.isUnavailable && 'opacity-40',
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{label}</p>
        <p className="truncate text-xs capitalize text-ink-muted">{statusLabel}</p>
      </div>
      <Switch
        checked={power.isOn}
        disabled={power.isUnavailable}
        onCheckedChange={() => {
          void power.toggle().catch((e) =>
            notify('Switch failed', e instanceof Error ? e.message : 'Error'),
          )
        }}
      />
    </div>
  )
}
