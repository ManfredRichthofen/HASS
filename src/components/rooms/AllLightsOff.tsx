import { useEntityGroup, useServiceCall } from 'hass-react'
import { Power } from 'lucide-react'
import { notify } from '#/components/ui/toast'
import { entities, isRoomLight } from '#/config/dashboard'
import { cn } from '#/lib/cn'
import { m, snappy, staggerItem, tap } from '#/lib/motion'

const allLights = (entities.allLightsOff as readonly string[]).filter(isRoomLight)

export function AllLightsOff() {
  const { callService } = useServiceCall()
  const lights = useEntityGroup([...allLights])
  const on = lights.filter((l) => l.state === 'on').length

  async function turnOff() {
    try {
      await callService('light', 'turn_off', { entity_id: allLights })
    } catch (e) {
      notify('Lights failed', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <m.button
      variants={staggerItem}
      type="button"
      disabled={on === 0}
      onClick={() => void turnOff()}
      whileTap={tap.soft}
      transition={snappy}
      className={cn(
        'flex min-h-13 w-full items-center justify-center gap-2.5 rounded-2xl text-[0.9375rem] font-bold transition-ui',
        on === 0 ? 'bg-surface text-ink-faint' : 'bg-surface text-ink hover:bg-surface-hover',
      )}
    >
      <Power className="size-5" />
      {on === 0 ? 'All lights are off' : `Turn off all lights (${on} on)`}
    </m.button>
  )
}
