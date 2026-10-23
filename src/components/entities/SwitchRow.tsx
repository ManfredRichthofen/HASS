import { useSwitch } from 'hass-react'
import { type LucideIcon, Power } from 'lucide-react'
import { DeviceRow } from '#/components/entities/DeviceRow'
import { Switch } from '#/components/ui/switch'
import { notify } from '#/components/ui/toast'
import { entityName } from '#/lib/entityName'

/** A switch.* entity as a DeviceRow. Place inside `<DeviceList>`. */
export function SwitchRow({
  entityId,
  label,
  icon = Power,
  showToggle = true,
}: {
  entityId: string
  label?: string
  icon?: LucideIcon
  /** Set false for read-only status rows that should not look controllable. */
  showToggle?: boolean
}) {
  const sw = useSwitch(entityId)
  const name =
    label ?? entityName(entityId, (sw.attributes as { friendly_name?: string }).friendly_name)

  return (
    <DeviceRow
      icon={icon}
      tone={sw.isOn ? 'light' : 'neutral'}
      name={name}
      caption={sw.isUnavailable ? 'Unavailable' : sw.isOn ? 'On' : 'Off'}
      unavailable={sw.isUnavailable}
      trailing={
        showToggle ? (
          <Switch
            aria-label={name}
            checked={sw.isOn}
            disabled={sw.isUnavailable}
            onCheckedChange={() => {
              void sw
                .toggle()
                .catch((e) => notify('Switch failed', e instanceof Error ? e.message : 'Error'))
            }}
          />
        ) : null
      }
    />
  )
}
