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
        'flex min-h-16 min-w-0 items-center gap-3 rounded-card border-ui border-border-subtle bg-surface px-4 py-3 text-left shadow-card transition-state',
        'modern:min-h-13 modern:rounded-pill modern:border-transparent modern:py-2',
        'glass:rounded-[1.25rem]',
        'brutal:-mt-0.5 brutal:-ml-0.5 brutal:border-ink brutal:shadow-none',
        selected && 'border-transparent bg-accent text-on-accent brutal:border-ink',
        disabled && 'opacity-50',
      )}
    >
      <Icon
        className={cn(
          'size-5 shrink-0 modern:size-[18px]',
          selected ? 'text-on-accent' : 'text-ink-faint',
        )}
      />
      <span
        className={cn(
          'text-display block truncate text-[1.0625rem] leading-tight',
          'modern:font-sans modern:text-[0.9375rem] modern:font-semibold modern:tracking-[-0.01em]',
        )}
      >
        {scene.label}
      </span>
    </m.button>
  )
}

/** Scenes as a grid of cards, all visible without scrolling (Modern: pills). The last scene run stays inverted. */
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
        // Every scene visible at once: 2×2 on phones, one row of four when
        // the page is wide but single-column, back to 2×2 beside Home's summary.
        'grid grid-cols-2 gap-2.5 @md:grid-cols-4 @xl:grid-cols-2',
        'brutal:gap-0 brutal:pt-0.5 brutal:pl-0.5',
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
