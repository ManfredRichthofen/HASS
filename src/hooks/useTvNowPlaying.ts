import { useEntityGroup, useMediaPlayer } from 'hass-react'
import { entities } from '#/config/dashboard'
import { friendlyAppName } from '#/lib/tvApps'

/** Launcher / system screens: the TV is on but nothing is "playing". */
const HOME_APP = /launcher|home|settings|^android tv$|^google tv$|^tv$|screensaver|ambient/i

/** Jellyfin clients publish through the Jellyfin integration, never through Cast. */
const JELLYFIN_CLIENT = /^(jellyfin|wholphin)$/i

const jellyfinIds = [...entities.tv.jellyfinIds]

/**
 * What the TV is showing, from whatever Home Assistant knows. Android TV Remote
 * only reports power and the current app. Richer detail (playing/paused, title,
 * artwork) comes from, in order:
 *   1. a Jellyfin session for the TV (`entities.tv.jellyfinIds`) that is playing/paused
 *   2. the Cast player (`entities.tv.playbackId`)
 * Every field falls back to the next source, so Netflix shows as "Netflix" even
 * when no title is published.
 *
 * Guards against stale data: a Jellyfin or Cast session that lingers paused after
 * the TV is switched off is ignored, and a Cast session left over from another app
 * (e.g. paused Spotify) is ignored while a Jellyfin client is in the foreground.
 */
export function useTvNowPlaying() {
  const tv = useMediaPlayer(entities.tv.id)
  const playbackId = (entities.tv as { playbackId?: string }).playbackId
  const cast = useMediaPlayer(playbackId ?? entities.tv.id)

  // Jellyfin creates a new entity per client session, so watch the whole range and
  // prefer a playing session over a paused one.
  const jellyfinSessions = useEntityGroup(jellyfinIds)
  const jellyfinId =
    jellyfinSessions.find((e) => e.state === 'playing')?.entity_id ??
    jellyfinSessions.find((e) => e.state === 'paused')?.entity_id
  const jellyfin = useMediaPlayer(jellyfinId ?? entities.tv.id)

  const foregroundApp = friendlyAppName(tv.appName ?? tv.currentSource)
  const jellyfinInForeground = JELLYFIN_CLIENT.test(foregroundApp ?? '')
  // A paused Cast session is stale when a Jellyfin app owns the screen.
  const castStale = jellyfinInForeground && !cast.isPlaying
  const info = jellyfinId ? jellyfin : castStale ? tv : cast

  const livePlaying = info.isPlaying || tv.isPlaying
  // The TV is explicitly off: a leftover paused session is not "now playing".
  const pausedStale = tv.isOff && !livePlaying
  const playing = livePlaying
  const paused = !playing && !pausedStale && (info.isPaused || tv.isPaused)

  const series = jellyfinId ? info.attributes.media_series_title : undefined
  const rawTitle = pausedStale ? null : (info.mediaTitle ?? tv.mediaTitle)
  const title =
    typeof series === 'string' && series && rawTitle ? `${series} · ${rawTitle}` : rawTitle
  const app = friendlyAppName(tv.appName ?? tv.currentSource ?? info.appName ?? info.currentSource)
  const onHomeScreen = !app || HOME_APP.test(app)
  const isOn = tv.isOn || playing || paused

  const active = isOn && (playing || paused || Boolean(title) || !onHomeScreen)
  // Artwork, progress and timing come from whichever player published the title.
  const source = info.mediaTitle && !pausedStale ? info : tv

  return { active, playing, paused, title, app, source, tv }
}
