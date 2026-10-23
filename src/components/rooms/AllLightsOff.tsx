import { useEntityGroup, useServiceCall } from 'hass-react'
import { LightbulbOff } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { notify } from '#/components/ui/toast'
import { entities, isRoomLight } from '#/config/dashboard'
import { cn } from '#/lib/cn'

const allLights = (entities.allLightsOff as readonly string[]).filter(isRoomLight)

/** House-wide "All lights off". Disabled (and says so) when nothing is on. */
export function AllLightsOff({ className }: { className?: string }) {
  const { callService } = useServiceCall()
  const lights = useEntityGroup([...allLights])
  const on = lights.filter((l) => l.state === 'on').length

  async function turnOff() {
    try {
      await callService('light', 'turn_off', { entity_id: allLights })
      notify('All lights off', `${on} turned off`)
    } catch (e) {
      notify('Lights failed', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={on === 0}
      onClick={() => void turnOff()}
      className={cn(className)}
    >
      <LightbulbOff className="size-[18px]" />
      {on === 0 ? 'All off' : `All lights off (${on})`}
    </Button>
  )
}

/** Lit-light count for headers ("3 with lights on"). */
export function useLightsOnCount() {
  const lights = useEntityGroup([...allLights])
  return lights.filter((l) => l.state === 'on').length
}
