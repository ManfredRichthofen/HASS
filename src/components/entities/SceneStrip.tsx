import { useServiceCall } from 'hass-react'
import { Armchair, Clapperboard, LightbulbOff, type LucideIcon, Sunrise } from 'lucide-react'
import { useState } from 'react'
import { notify } from '#/components/ui/toast'
import { entities, isRoomLight } from '#/config/dashboard'
import { cn } from '#/lib/cn'
import { m, snappy, tap } from '#/lib/motion'

const icons: Record<string, LucideIcon> = {
  daylight: Sunrise,
  relax: Armchair,
  movie: Clapperboard,
  off: LightbulbOff,
}

type LightScene = (typeof entities.lightScenes)[number]

/** "Warm, 35–45%" — read from the scene's own actions so it stays true when the config changes. */
function describe(scene: LightScene): string {
  if (scene.kind === 'lights_off') return 'Every light off'
  const levels: number[] = []
  const kelvins: number[] = []
  for (const action of scene.actions) {
    const data = action.data as { brightness_pct?: number; color_temp_kelvin?: number }
    if (action.service !== 'turn_on') continue
    if (typeof data.brightness_pct === 'number') levels.push(data.brightness_pct)
    if (typeof data.color_temp_kelvin === 'number') kelvins.push(data.color_temp_kelvin)
  }
  const avgK = kelvins.length ? kelvins.reduce((a, b) => a + b, 0) / kelvins.length : null
  const tone =
    avgK == null ? null : avgK < 3000 ? 'Warm' : avgK < 4000 ? 'Soft white' : 'Cool white'
  const lo = Math.min(...levels)
  const hi = Math.max(...levels)
  const range = levels.length ? (lo === hi ? `${lo}%` : `${lo}–${hi}%`) : null
  return [tone, range].filter(Boolean).join(', ') || 'Lights'
}

/** Scenes as a swipeable row of cards (Modern: compact pills). The last scene run stays inverted. */
export function SceneStrip({ scenes = entities.lightScenes }: { scenes?: readonly LightScene[] }) {
  const { callService } = useServiceCall()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [lastId, setLastId] = useState<string | null>(null)

  async function runScene(scene: LightScene) {
    setBusyId(scene.id)
    try {
      if (scene.kind === 'lights_off') {
        const entityIds = (entities.allLightsOff as readonly string[]).filter(isRoomLight)
        await callService('light', 'turn_off', { entity_id: [...entityIds] })
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
    <div className="no-scrollbar -mx-page flex gap-3 overflow-x-auto px-page pt-0.5 pb-2 sm:mx-0 sm:px-0 brutal:gap-0">
      {scenes.map((scene) => {
        const Icon = icons[scene.id] ?? Sunrise
        const selected = lastId === scene.id || busyId === scene.id
        return (
          <m.button
            key={scene.id}
            type="button"
            aria-pressed={selected}
            disabled={busyId != null && busyId !== scene.id}
            onClick={() => void runScene(scene)}
            whileTap={tap.medium}
            transition={snappy}
            className={cn(
              'flex min-h-28 w-38 rounded-card border-ui border-border-subtle bg-surface shadow-card modern:border-transparent shrink-0 flex-col justify-between gap-5 p-4 text-left transition-state',
              'walnut:min-h-33 walnut:w-40',
              'modern:min-h-12 modern:w-auto modern:flex-row modern:items-center modern:gap-2.5 modern:rounded-pill modern:py-0 modern:pr-5 modern:pl-3.5',
              'brutal:w-40 brutal:shadow-none brutal:not-first:-ml-0.5',
              selected && 'border-transparent bg-accent text-on-accent brutal:border-ink',
              busyId != null && busyId !== scene.id && 'opacity-50',
            )}
          >
            <Icon
              className={cn(
                'size-[22px] modern:size-[18px]',
                selected ? 'text-on-accent' : 'text-ink-faint',
              )}
            />
            <span>
              <span
                className={cn(
                  'text-display block text-lg leading-tight',
                  'modern:font-sans modern:text-[0.9375rem] modern:font-semibold modern:tracking-[-0.01em]',
                )}
              >
                {scene.label}
              </span>
              <span
                className={cn(
                  'mt-0.5 block text-[0.8125rem] modern:hidden brutal:font-label brutal:text-xs',
                  selected ? 'text-on-accent/75' : 'text-ink-muted',
                )}
              >
                {describe(scene)}
              </span>
            </span>
          </m.button>
        )
      })}
    </div>
  )
}
