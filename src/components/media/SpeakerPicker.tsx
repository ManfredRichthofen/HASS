import { useMediaPlayer, useServiceCall } from 'hass-react'
import { Check, Plus, Volume1 } from 'lucide-react'
import { Slider } from '#/components/ui/slider'
import { notify } from '#/components/ui/toast'
import { cn } from '#/lib/cn'
import { mediaTargets } from '#/lib/musicAssistant'

export const speakers = mediaTargets.filter((t) => t.id !== 'media_player.all')

function useSpeaker(id: string) {
  const player = useMediaPlayer(id)
  const members = (player.attributes as { group_members?: string[] }).group_members ?? []
  const active = player.isPlaying || player.isPaused
  return { player, members, active }
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

function SpeakerRow({ id, label, leader }: { id: string; label: string; leader: string }) {
  const { callService } = useServiceCall()
  const { player, members, active } = useSpeaker(id)
  const lead = useSpeaker(leader)
  const on = active || (lead.members.includes(id) && lead.active)
  const unavailable = player.isUnavailable

  async function toggle() {
    try {
      if (on) {
        if (members.length > 1 || lead.members.includes(id)) {
          await callService('media_player', 'unjoin', { entity_id: id })
        } else {
          await player.pause()
        }
        notify(`${label} stopped`)
      } else {
        const leaderId = lead.active && leader !== id ? leader : null
        if (leaderId) {
          await callService('media_player', 'join', { entity_id: leaderId, group_members: [id] })
        } else {
          await player.play()
        }
        notify(`Playing in ${label}`)
      }
    } catch (e) {
      notify('Speaker failed', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-15 items-center gap-3 rounded-control border-ui border-border-subtle transition-state',
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
        onClick={() => void toggle()}
        className="flex min-h-14 min-w-36 items-center gap-3 pr-2 pl-2.5 text-left"
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
        <div className="flex min-w-0 flex-1 items-center gap-2.5 pr-3">
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
    </div>
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
