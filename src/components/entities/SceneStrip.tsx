import { useState } from 'react'
import { useServiceCall } from 'hass-react'
import {
  Clapperboard,
  Armchair,
  LightbulbOff,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { entities } from '#/config/dashboard'
import { cn } from '#/lib/cn'
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

  async function runScene(scene: LightScene) {
    setBusyId(scene.id)
    try {
      if (scene.kind === 'lights_off') {
        await callService('light', 'turn_off', {
          entity_id: [...entities.allLightsOff],
        })
      } else if (scene.kind === 'actions') {
        for (const action of scene.actions) {
          await callService(action.domain, action.service, action.data)
        }
      }
      notify(scene.label)
    } catch (e) {
      notify('Scene failed', e instanceof Error ? e.message : 'Error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {scenes.map((scene) => {
        const Icon = icons[scene.id] ?? Sun
        const active = busyId === scene.id
        return (
          <button
            key={scene.id}
            type="button"
            disabled={busyId != null}
            onClick={() => void runScene(scene)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2.5 text-sm font-medium transition active:scale-[0.98]',
              'border-border-subtle bg-surface text-ink hover:border-accent/35',
              active && 'border-accent/40 bg-accent-soft text-accent',
              busyId != null && !active && 'opacity-50',
            )}
          >
            <Icon className="size-4" />
            {scene.label}
          </button>
        )
      })}
    </div>
  )
}
