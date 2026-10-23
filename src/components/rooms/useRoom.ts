import { useEntityGroup, useServiceCall } from 'hass-react'
import { LayoutGrid } from 'lucide-react'
import { roomIcons } from '#/components/rooms/roomMeta'
import { notify } from '#/components/ui/toast'
import { type AreaConfig, areaDeviceCount, areaLightIds, areaTempId } from '#/config/dashboard'
import { useOptimisticValue } from '#/hooks/useOptimisticValue'

/** Everything a room card or list row needs: lamp states, a short sentence, and a power toggle. */
export function useRoom(area: AreaConfig) {
  const { callService } = useServiceCall()
  const lightIds = areaLightIds(area)
  const lights = useEntityGroup([...lightIds])
  const serverLit = lights.map((l) => l.state === 'on')
  const serverOn = serverLit.filter(Boolean).length
  const serverIsLit = serverOn > 0
  const { value: isLit, commit } = useOptimisticValue(serverIsLit)
  const pending = isLit !== serverIsLit
  const lit = pending ? lightIds.map(() => isLit) : serverLit
  const on = pending ? (isLit ? lightIds.length : 0) : serverOn
  const hasLights = lightIds.length > 0
  const deviceCount = areaDeviceCount(area)
  const hasClimate = (area.climateReadings?.length ?? 0) > 0 || area.sensors.length > 0

  const summary = hasLights
    ? on === 0
      ? 'Lights off'
      : lightIds.length === 1
        ? 'Light on'
        : `${on} of ${lightIds.length} lights`
    : deviceCount === 0 && hasClimate
      ? 'Sensors only'
      : `${deviceCount} device${deviceCount === 1 ? '' : 's'}`

  const togglePower = () => {
    const next = !isLit
    commit(next, async () => {
      try {
        await callService('light', isLit ? 'turn_off' : 'turn_on', { entity_id: lightIds })
        notify(isLit ? `${area.name} off` : `${area.name} on`)
      } catch (e) {
        notify('Lights failed', e instanceof Error ? e.message : 'Error')
        throw e
      }
    })
  }

  return {
    Icon: roomIcons[area.id] ?? LayoutGrid,
    tempId: areaTempId(area),
    lit,
    on,
    isLit,
    hasLights,
    summary,
    togglePower,
  }
}
