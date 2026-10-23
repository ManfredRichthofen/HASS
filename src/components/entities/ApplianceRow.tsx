import { useSensor, useSwitch } from 'hass-react'
import { WashingMachine } from 'lucide-react'
import { DeviceRow } from '#/components/entities/DeviceRow'
import { Switch } from '#/components/ui/switch'
import { notify } from '#/components/ui/toast'

/** Appliance power switch with its current cycle status as the state line. Place inside `<DeviceList>`. */
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
    <DeviceRow
      icon={WashingMachine}
      tone={power.isOn ? 'info' : 'neutral'}
      name={label}
      caption={statusLabel}
      unavailable={power.isUnavailable}
      trailing={
        <Switch
          aria-label={`${label} power`}
          checked={power.isOn}
          disabled={power.isUnavailable}
          onCheckedChange={() => {
            void power
              .toggle()
              .catch((e) => notify('Switch failed', e instanceof Error ? e.message : 'Error'))
          }}
        />
      }
    />
  )
}
