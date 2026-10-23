import { useMediaPlayer, useMediaPlayers } from 'hass-react'
import { useMemo } from 'react'
import { entities } from '#/config/dashboard'
import { mediaTargets } from '#/lib/musicAssistant'

const musicIds = new Set(mediaTargets.map((t) => t.id))

const roomLabel = (entityId: string) =>
  mediaTargets.find((t) => t.id === entityId)?.label ??
  entities.mediaPlayers.find((t) => t.id === entityId)?.label ??
  'Music'

/**
 * Music Assistant often leaves `media_player.all` idle while rooms play.
 * Prefer a playing/paused room speaker; fall back to Everywhere.
 */
export const useActiveMedia = () => {
  const players = useMediaPlayers()
  const fallbackId = entities.mediaAll

  const activeId = useMemo(() => {
    const music = players.filter((p) => musicIds.has(p.entity_id))
    const rank = (state: string) => (state === 'playing' ? 2 : state === 'paused' ? 1 : 0)
    const active = music
      .filter((p) => rank(p.state) > 0)
      .sort((a, b) => {
        const byState = rank(b.state) - rank(a.state)
        if (byState !== 0) return byState
        // Prefer a real room over the Everywhere player
        const aRoom = a.entity_id === fallbackId ? 1 : 0
        const bRoom = b.entity_id === fallbackId ? 1 : 0
        return aRoom - bRoom
      })
    return active[0]?.entity_id ?? null
  }, [players, fallbackId])

  const entityId = activeId ?? fallbackId
  const player = useMediaPlayer(entityId)

  const isPlaying = Boolean(activeId) && player.isPlaying
  const isPaused = Boolean(activeId) && player.isPaused
  const isActive = isPlaying || isPaused

  const roomsPlaying = useMemo(() => {
    return players
      .filter(
        (p) =>
          musicIds.has(p.entity_id) &&
          p.entity_id !== fallbackId &&
          (p.state === 'playing' || p.state === 'paused'),
      )
      .map((p) => roomLabel(p.entity_id))
  }, [players, fallbackId])

  const mediaTitle = isActive ? player.mediaTitle : null
  const mediaArtist = isActive ? player.mediaArtist : null
  const room =
    roomsPlaying.length === 0
      ? null
      : roomsPlaying.length === mediaTargets.filter((t) => t.id !== fallbackId).length
        ? 'Everywhere'
        : roomsPlaying.join(', ')

  return {
    entityId,
    player,
    isPlaying,
    isPaused,
    isActive,
    mediaTitle,
    mediaArtist,
    room,
    roomsPlaying,
  }
}
