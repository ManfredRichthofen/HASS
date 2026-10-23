import { useEntityGroup, useServiceCall } from 'hass-react'
import { LayoutGrid } from 'lucide-react'
import { roomIcons } from '#/components/rooms/roomMeta'
import { notify } from '#/components/ui/toast'
import { type AreaConfig, areaDeviceCount, areaLightIds, areaTempId } from '#/config/dashboard'

/** Everything a room card or list row needs: lamp states, a short sentence, and a power toggle. */
export function useRoom(area: AreaConfig) {
  const { callService } = useServiceCall()
  const lightIds = areaLightIds(area)
  const lights = useEntityGroup([...lightIds])
  const lit = lights.map((l) => l.state === 'on')
  const on = lit.filter(Boolean).length
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

  async function togglePower() {
    try {
      await callService('light', on > 0 ? 'turn_off' : 'turn_on', { entity_id: lightIds })
      notify(on > 0 ? `${area.name} off` : `${area.name} on`)
    } catch (e) {
      notify('Lights failed', e instanceof Error ? e.message : 'Error')
    }
  }

  return {
    Icon: roomIcons[area.id] ?? LayoutGrid,
    tempId: areaTempId(area),
    lit,
    on,
    isLit: on > 0,
    hasLights,
    summary,
    togglePower,
  }
}
