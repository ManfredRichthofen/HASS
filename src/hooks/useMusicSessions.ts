import { useEntityGroup, useServiceCall } from 'hass-react'
import { useCallback, useMemo } from 'react'
import { notify } from '#/components/ui/toast'
import { mediaTargets } from '#/lib/musicAssistant'

/** Room speakers (everything except the "Everywhere" helper player). */
export const rooms = mediaTargets.filter((t) => t.id !== 'media_player.all')
const roomIds: string[] = rooms.map((r) => r.id)
const labelOf = (id: string) => rooms.find((r) => r.id === id)?.label ?? 'Speaker'

export type SessionState = 'playing' | 'paused' | 'idle'

/**
 * One thing playing: a leader speaker and the rooms grouped with it. A room on
 * its own is a session of one.
 */
export type MusicSession = {
  leader: string
  members: string[]
  state: SessionState
  title: string | null
  artist: string | null
  /** The speakers by name: "Living Room", "Living Room + Kitchen", "Living Room + 2". */
  label: string
}

export type RoomInfo = {
  id: string
  label: string
  /** The session leader this room belongs to (itself when ungrouped). */
  leader: string
  state: SessionState
  volume: number
  muted: boolean
  unavailable: boolean
}

function asState(state: string | undefined): SessionState {
  return state === 'playing' ? 'playing' : state === 'paused' ? 'paused' : 'idle'
}

export function sessionLabel(members: string[]) {
  const [first, ...rest] = members.map(labelOf)
  if (!first) return 'Speakers'
  if (rest.length === 0) return first
  if (rest.length === 1) return `${first} + ${rest[0]}`
  return `${first} + ${rest.length}`
}

/**
 * Who is playing what, worked out from each room's `group_members`
 * (HA lists the leader first). Sessions are sorted playing → paused → idle,
 * so `sessions[0]` is what the Music page should show.
 */
export function useMusicSessions() {
  // Not `useMediaPlayers()`: it fetches every entity state per mount and
  // re-renders on any media_player change in the house.
  const players = useEntityGroup(roomIds)

  return useMemo(() => {
    const byId = new Map(players.map((p) => [p.entity_id, p]))

    const roomInfo: RoomInfo[] = rooms.map((r) => {
      const p = byId.get(r.id)
      const attrs = (p?.attributes ?? {}) as {
        group_members?: string[]
        volume_level?: number
        is_volume_muted?: boolean
      }
      const group = (attrs.group_members ?? []).filter((id) => roomIds.includes(id))
      const leader = group.length > 1 && group[0] ? group[0] : r.id
      return {
        id: r.id,
        label: r.label,
        leader,
        state: asState(p?.state),
        volume: Math.round((attrs.volume_level ?? 0) * 100),
        muted: Boolean(attrs.is_volume_muted),
        unavailable: !p || p.state === 'unavailable',
      }
    })

    const groups = new Map<string, string[]>()
    for (const room of roomInfo) {
      const list = groups.get(room.leader) ?? []
      list.push(room.id)
      groups.set(room.leader, list)
    }

    const rank = { playing: 2, paused: 1, idle: 0 } as const
    const sessions: MusicSession[] = [...groups.entries()]
      .map(([leader, members]) => {
        const lead = byId.get(leader)
        const attrs = (lead?.attributes ?? {}) as { media_title?: string; media_artist?: string }
        // Keep the leader first, then room order.
        const ordered = [leader, ...members.filter((m) => m !== leader)]
        return {
          leader,
          members: ordered,
          state: asState(lead?.state),
          title: attrs.media_title ?? null,
          artist: attrs.media_artist ?? null,
          label: sessionLabel(ordered),
        }
      })
      .sort((a, b) => rank[b.state] - rank[a.state])

    const active = sessions.filter((s) => s.state !== 'idle')
    return { rooms: roomInfo, sessions, active }
  }, [players])
}

/** Group actions, all in one place, each with its own toast. */
export function useGroupActions() {
  const { callService } = useServiceCall()

  const run = useCallback(async (action: () => Promise<unknown>, done: string, fail: string) => {
    try {
      await action()
      notify(done)
    } catch (e) {
      notify(fail, e instanceof Error ? e.message : 'Error')
    }
  }, [])

  return useMemo(
    () => ({
      /** Add a room to the session led by `leader`. */
      add: (leader: string, id: string) =>
        run(
          () => callService('media_player', 'join', { entity_id: leader, group_members: [id] }),
          `Playing in ${labelOf(id)}`,
          'Couldn’t add room',
        ),
      /** Take a speaker out of its group (it stops playing). */
      remove: (id: string) =>
        run(
          () => callService('media_player', 'unjoin', { entity_id: id }),
          `${labelOf(id)} removed`,
          'Couldn’t remove room',
        ),
      /** Select every speaker: all rooms join `leader`. */
      selectAll: (leader: string) =>
        run(
          () =>
            callService('media_player', 'join', {
              entity_id: leader,
              group_members: roomIds.filter((id) => id !== leader),
            }),
          'All speakers selected',
          'Grouping failed',
        ),
      /**
       * Deselect the group's main speaker: the music (if any) moves to the next
       * speaker, which then leads the rest. Returns the new leader.
       */
      dropLeader: async (members: string[], playing: boolean) => {
        const [leader, next, ...others] = members
        if (!leader || !next) return leader
        try {
          await callService('media_player', 'unjoin', { entity_id: [next, ...others] })
          if (playing) {
            await callService('music_assistant', 'transfer_queue', {
              entity_id: next,
              source_player: leader,
              auto_play: true,
            })
          }
          if (others.length) {
            await callService('media_player', 'join', { entity_id: next, group_members: others })
          }
          notify(`${labelOf(leader)} removed`)
        } catch (e) {
          notify('Couldn’t remove speaker', e instanceof Error ? e.message : 'Error')
          throw e
        }
        return next
      },
      /** Move the whole queue to another room and keep playing there. */
      moveTo: (from: string, to: string) =>
        run(
          () =>
            callService('music_assistant', 'transfer_queue', {
              entity_id: to,
              source_player: from,
              auto_play: true,
            }),
          `Moved to ${labelOf(to)}`,
          'Move failed',
        ),
      /** Pause a room (or the group it leads). */
      pause: (id: string) =>
        run(
          () => callService('media_player', 'media_pause', { entity_id: id }),
          `${labelOf(id)} paused`,
          'Couldn’t pause',
        ),
      /** Mute or unmute several rooms at once. */
      mute: (ids: string[], muted: boolean) =>
        callService('media_player', 'volume_mute', {
          entity_id: ids,
          is_volume_muted: muted,
        }).then(() => undefined),
      /** Set one room's volume (0–100). */
      volume: (id: string, value: number) =>
        callService('media_player', 'volume_set', {
          entity_id: id,
          volume_level: value / 100,
        }).catch((e) => notify('Volume failed', e instanceof Error ? e.message : 'Error')),
    }),
    [callService, run],
  )
}
