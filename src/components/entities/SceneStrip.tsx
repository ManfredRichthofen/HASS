import { useServiceCall } from 'hass-react'
import { Armchair, Clapperboard, LightbulbOff, type LucideIcon, Sunrise } from 'lucide-react'
import { useState } from 'react'
import { notify } from '#/components/ui/toast'
import { entities, isRoomLight } from '#/config/dashboard'
import { useScrollSafePress } from '#/hooks/useScrollSafePress'
import { cn } from '#/lib/cn'
import { m, snappy, tap } from '#/lib/motion'

const icons: Record<string, LucideIcon> = {
  daylight: Sunrise,
  relax: Armchair,
  movie: Clapperboard,
  off: LightbulbOff,
}

type LightScene = (typeof entities.lightScenes)[number]

function SceneCard({
  scene,
  selected,
  disabled,
  onRun,
}: {
  scene: LightScene
  selected: boolean
  disabled: boolean
  onRun: (scene: LightScene) => void
}) {
  const Icon = icons[scene.id] ?? Sunrise
  const press = useScrollSafePress(() => onRun(scene))

  return (
    <m.button
      type="button"
      aria-pressed={selected}
      aria-label={scene.label}
      disabled={disabled}
      {...press}
      whileTap={tap.medium}
      transition={snappy}
      className={cn(
        'flex min-h-24 w-38 shrink-0 flex-col justify-between gap-4 rounded-card border-ui border-border-subtle bg-surface p-4 text-left shadow-card transition-state modern:border-transparent',
        'walnut:min-h-28 walnut:w-40',
        'modern:min-h-12 modern:w-auto modern:flex-row modern:items-center modern:gap-2.5 modern:rounded-pill modern:py-0 modern:pr-5 modern:pl-3.5',
        'brutal:w-40 brutal:shadow-none brutal:not-first:-ml-0.5',
        '@xl:min-h-18 @xl:min-w-0 @xl:w-auto @xl:shrink @xl:gap-2.5 @xl:p-3',
        'walnut:@xl:min-h-20 @xl:w-auto',
        'modern:@xl:min-h-11 @xl:w-full',
        'brutal:@xl:w-auto brutal:@xl:not-first:ml-0',
        selected && 'border-transparent bg-accent text-on-accent brutal:border-ink',
        disabled && 'opacity-50',
      )}
    >
      <Icon
        className={cn(
          'size-[22px] modern:size-[18px]',
          selected ? 'text-on-accent' : 'text-ink-faint',
        )}
      />
      <span
        className={cn(
          'text-display block text-lg leading-tight @xl:text-base',
          'modern:font-sans modern:text-[0.9375rem] modern:font-semibold modern:tracking-[-0.01em]',
        )}
      >
        {scene.label}
      </span>
    </m.button>
  )
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
    <div
      className={cn(
        'no-scrollbar -mx-page flex gap-3 overflow-x-auto px-page pt-0.5 pb-2 sm:mx-0 sm:px-0',
        'brutal:gap-0',
        // Page @container: wrap into a 2×2 once Home goes two-column (@xl)
        '@xl:mx-0 @xl:grid @xl:grid-cols-2 @xl:gap-2.5 @xl:overflow-visible @xl:px-0 @xl:pb-0',
        'brutal:@xl:gap-0',
      )}
    >
      {scenes.map((scene) => (
        <SceneCard
          key={scene.id}
          scene={scene}
          selected={lastId === scene.id || busyId === scene.id}
          disabled={busyId != null && busyId !== scene.id}
          onRun={(s) => void runScene(s)}
        />
      ))}
    </div>
  )
}
