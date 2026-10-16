import { useState } from 'react'
import { useServiceCall } from 'hass-react'
import {
  Clapperboard,
  Armchair,
  LightbulbOff,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { entities, isRoomLight } from '#/config/dashboard'
import { cn } from '#/lib/cn'
import { m, snappy } from '#/lib/motion'
import { notify } from '#/components/ui/toast'

const icons: Record<string, LucideIcon> = {
  daylight: Sun,
  relax: Armchair,
  movie: Clapperboard,
  off: LightbulbOff,
}

type LightScene = (typeof entities.lightScenes)[number]

export function SceneStrip({
  scenes = entities.lightScenes,
}: {
  scenes?: readonly LightScene[]
}) {
  const { callService } = useServiceCall()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [lastId, setLastId] = useState<string | null>(null)

  async function runScene(scene: LightScene) {
    setBusyId(scene.id)
    try {
      if (scene.kind === 'lights_off') {
        const entityIds = (entities.allLightsOff as readonly string[]).filter(
          isRoomLight,
        )
        await callService('light', 'turn_off', {
          entity_id: [...entityIds],
        })
      } else if (scene.kind === 'actions') {
        for (const action of scene.actions) {
          await callService(action.domain, action.service, action.data)
        }
      }
      notify(scene.label)
      setLastId(scene.id)
    } catch (e) {
      notify('Scene failed', e instanceof Error ? e.message : 'Error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {scenes.map((scene) => {
        const Icon = icons[scene.id] ?? Sun
        const active = busyId === scene.id
        const selected = lastId === scene.id
        return (
          <m.button
            key={scene.id}
            type="button"
            disabled={busyId != null}
            onClick={() => void runScene(scene)}
            whileTap={{ scale: 0.97 }}
            transition={snappy}
            className={cn(
              'touch-target inline-flex items-center justify-center gap-1.5 rounded-xl border px-2.5 text-sm font-semibold transition sm:gap-2 sm:px-3',
              selected || active
                ? 'border-light/45 bg-light-soft text-light'
                : 'border-border-subtle bg-surface text-ink hover:bg-surface-hover',
              busyId != null && !active && 'opacity-50',
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{scene.label}</span>
          </m.button>
        )
      })}
    </div>
  )
}
