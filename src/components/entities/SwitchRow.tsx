import { useSwitch } from 'hass-react'
import { type LucideIcon, Power } from 'lucide-react'
import { DeviceRow } from '#/components/entities/DeviceRow'
import { Switch } from '#/components/ui/switch'
import { notify } from '#/components/ui/toast'
import { useOptimisticValue } from '#/hooks/useOptimisticValue'
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
  const { value: on, commit } = useOptimisticValue(sw.isOn)
  const name =
    label ?? entityName(entityId, (sw.attributes as { friendly_name?: string }).friendly_name)

  const handleToggle = () => {
    commit(!on, async () => {
      try {
        await sw.toggle()
      } catch (e) {
        notify('Switch failed', e instanceof Error ? e.message : 'Error')
        throw e
      }
    })
  }

  return (
    <DeviceRow
      icon={icon}
      tone={on ? 'light' : 'neutral'}
      name={name}
      caption={sw.isUnavailable ? 'Unavailable' : on ? 'On' : 'Off'}
      unavailable={sw.isUnavailable}
      trailing={
        showToggle ? (
          <Switch
            aria-label={name}
            checked={on}
            disabled={sw.isUnavailable}
            onCheckedChange={handleToggle}
          />
        ) : null
      }
    />
  )
}
