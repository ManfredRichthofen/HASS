import { useMediaPlayer, useServiceCall } from 'hass-react'
import { Check, Plus, Volume1, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Drawer, DrawerContent } from '#/components/ui/drawer'
import { Slider } from '#/components/ui/slider'
import { notify } from '#/components/ui/toast'
import { cn } from '#/lib/cn'
import { m, snappy, tap } from '#/lib/motion'
import { mediaTargets } from '#/lib/musicAssistant'

export const speakers = mediaTargets.filter((t) => t.id !== 'media_player.all')

function useSpeaker(id: string) {
  const player = useMediaPlayer(id)
  const members = (player.attributes as { group_members?: string[] }).group_members ?? []
  const active = player.isPlaying || player.isPaused
  return { player, members, active }
}

async function toggleSpeaker(
  callService: ReturnType<typeof useServiceCall>['callService'],
  id: string,
  label: string,
  leader: string,
  on: boolean,
  members: string[],
  leadMembers: string[],
  leadActive: boolean,
  pause: () => Promise<void>,
  play: () => Promise<void>,
) {
  try {
    if (on) {
      if (members.length > 1 || leadMembers.includes(id)) {
        await callService('media_player', 'unjoin', { entity_id: id })
      } else {
        await pause()
      }
      notify(`${label} stopped`)
      return
    }
    const leaderId = leadActive && leader !== id ? leader : null
    if (leaderId) {
      await callService('media_player', 'join', { entity_id: leaderId, group_members: [id] })
    } else {
      await play()
    }
    notify(`Playing in ${label}`)
  } catch (e) {
    notify('Speaker failed', e instanceof Error ? e.message : 'Error')
    throw e
  }
}

/**
 * "Playing in": rooms you tick on and off. Ticking a room joins it to whatever
 * is already playing (Music Assistant / HA grouping); unticking removes it.
 * Playing rooms show their own volume inline.
 */
export function SpeakerPicker({ leader }: { leader: string }) {
  return (
    <div className="grid gap-2 brutal:gap-0">
      {speakers.map((s) => (
        <SpeakerRow key={s.id} id={s.id} label={s.label} leader={leader} />
      ))}
    </div>
  )
}

function useOptimisticOn(serverOn: boolean) {
  const [optimistic, setOptimistic] = useState<boolean | null>(null)
  useEffect(() => {
    if (optimistic !== null && optimistic === serverOn) setOptimistic(null)
  }, [optimistic, serverOn])
  return {
    on: optimistic ?? serverOn,
    setOptimistic,
  }
}

function SpeakerRow({ id, label, leader }: { id: string; label: string; leader: string }) {
  const { callService } = useServiceCall()
  const { player, members, active } = useSpeaker(id)
  const lead = useSpeaker(leader)
  const serverOn = active || (lead.members.includes(id) && lead.active)
  const { on, setOptimistic } = useOptimisticOn(serverOn)
  const unavailable = player.isUnavailable

  const handleToggle = () => {
    const next = !on
    setOptimistic(next)
    void toggleSpeaker(
      callService,
      id,
      label,
      leader,
      on,
      members,
      lead.members,
      lead.active,
      () => player.pause(),
      () => player.play(),
    ).catch(() => setOptimistic(!next))
  }

  return (
    <m.div
      whileTap={unavailable ? undefined : tap.soft}
      transition={snappy}
      className={cn(
        'flex min-h-15 flex-wrap items-center gap-x-3 gap-y-1 rounded-control border-ui border-border-subtle transition-state',
        on && 'border-transparent bg-surface shadow-card',
        'modern:border-transparent',
        'brutal:border-ink brutal:not-first:-mt-0.5',
        on && 'brutal:border-ink brutal:bg-on-from brutal:shadow-none',
        unavailable && 'opacity-45',
      )}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: a styled row toggle; a native checkbox cannot hold this layout */}
      <button
        type="button"
        role="checkbox"
        aria-checked={on}
        aria-label={`Play in ${label}`}
        disabled={unavailable}
        onClick={handleToggle}
        className="flex min-h-14 min-w-0 flex-1 basis-36 items-center gap-3 pr-2 pl-2.5 text-left"
      >
        <span
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-pill border-2 border-border-strong text-ink-muted transition-state',
            on && 'border-accent bg-accent text-on-accent',
            on && 'brutal:border-ink brutal:bg-ink brutal:text-on-from',
          )}
        >
          {on ? <Check className="size-4" /> : <Plus className="size-4" />}
        </span>
        <span
          className={cn(
            'truncate text-[0.9375rem]',
            on ? 'font-semibold text-ink' : 'font-medium text-ink-muted',
          )}
        >
          {label}
        </span>
      </button>
      {on ? (
        <div className="flex min-w-0 flex-1 basis-40 items-center gap-2.5 px-2.5 pb-2.5 sm:pr-3 sm:pb-0">
          <Volume1 className="size-[18px] shrink-0 text-ink-faint brutal:text-ink" />
          <Slider
            aria-label={`${label} volume`}
            min={0}
            max={100}
            step={1}
            value={Math.round((player.volumeLevel ?? 0) * 100)}
            onValueCommitted={(value) => {
              const next = Array.isArray(value) ? (value[0] ?? 0) : value
              void player
                .setVolume(next / 100)
                .catch((e) => notify('Volume failed', e instanceof Error ? e.message : 'Error'))
            }}
          />
        </div>
      ) : (
        <span className="ml-auto pr-4 text-[0.8125rem] text-ink-faint brutal:font-label brutal:text-xs">
          Idle
        </span>
      )}
    </m.div>
  )
}

function SpeakerChip({ id, label, leader }: { id: string; label: string; leader: string }) {
  const { callService } = useServiceCall()
  const { player, members, active } = useSpeaker(id)
  const lead = useSpeaker(leader)
  const serverOn = active || (lead.members.includes(id) && lead.active)
  const { on, setOptimistic } = useOptimisticOn(serverOn)
  const unavailable = player.isUnavailable

  const handleToggle = () => {
    const next = !on
    setOptimistic(next)
    void toggleSpeaker(
      callService,
      id,
      label,
      leader,
      on,
      members,
      lead.members,
      lead.active,
      () => player.pause(),
      () => player.play(),
    ).catch(() => setOptimistic(!next))
  }

  return (
    <m.button
      type="button"
      whileTap={unavailable ? undefined : tap.soft}
      transition={snappy}
      role="checkbox"
      aria-checked={on}
      aria-label={`Play in ${label}`}
      disabled={unavailable}
      onClick={handleToggle}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill border-ui border-border-subtle px-3 text-sm font-medium transition-state',
        on
          ? 'border-transparent bg-accent text-on-accent brutal:border-ink brutal:bg-ink brutal:text-on-from'
          : 'text-ink-muted hover:text-ink',
        unavailable && 'opacity-45',
      )}
    >
      {on ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
      {label}
    </m.button>
  )
}

/** Compact chip strip + Group all + volumes drawer. Always visible on the Music page. */
export function SpeakerChips({ leader }: { leader: string }) {
  const [volumesOpen, setVolumesOpen] = useState(false)
  const groupAll = useGroupAll(leader)

  return (
    <>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-label">Playing in</span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setVolumesOpen(true)}
              className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-ink-muted transition-ui hover:text-ink brutal:font-label brutal:text-xs brutal:uppercase brutal:underline"
              aria-label="Adjust speaker volumes"
            >
              <Volume2 className="size-3.5" />
              Volumes
            </button>
            <button
              type="button"
              onClick={() => void groupAll()}
              className="min-h-9 text-sm font-semibold text-ink-muted transition-ui hover:text-ink brutal:font-label brutal:text-xs brutal:uppercase brutal:underline"
            >
              Group all
            </button>
          </div>
        </div>
        <div
          role="group"
          aria-label="Speakers"
          className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {speakers.map((s) => (
            <SpeakerChip key={s.id} id={s.id} label={s.label} leader={leader} />
          ))}
        </div>
      </div>

      <Drawer open={volumesOpen} onOpenChange={setVolumesOpen}>
        <DrawerContent title="Volumes" description="Adjust each room that’s playing">
          <SpeakerPicker leader={leader} />
        </DrawerContent>
      </Drawer>
    </>
  )
}

/** Join every speaker to the leader. */
export function useGroupAll(leader: string) {
  const { callService } = useServiceCall()
  return async () => {
    try {
      await callService('media_player', 'join', {
        entity_id: leader,
        group_members: speakers.map((s) => s.id).filter((id) => id !== leader),
      })
      notify('Playing everywhere')
    } catch (e) {
      notify('Grouping failed', e instanceof Error ? e.message : 'Error')
    }
  }
}
