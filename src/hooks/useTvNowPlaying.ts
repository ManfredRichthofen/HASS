import { useMediaPlayer } from 'hass-react'
import { entities } from '#/config/dashboard'
import { friendlyAppName } from '#/lib/tvApps'

/** Launcher / system screens: the TV is on but nothing is "playing". */
const HOME_APP = /launcher|home|settings|^android tv$|^google tv$|^tv$|screensaver|ambient/i

/**
 * What the TV is showing, from whatever Home Assistant knows. Android TV Remote
 * only reports power and the current app; a Cast player (set as
 * `entities.tv.playbackId`) can add playing/paused, title and artwork. Every
 * field falls back to the next source, so Netflix shows as "Netflix" even when
 * no title is published.
 */
export function useTvNowPlaying() {
  const tv = useMediaPlayer(entities.tv.id)
  const playbackId = (entities.tv as { playbackId?: string }).playbackId
  const info = useMediaPlayer(playbackId ?? entities.tv.id)

  const playing = info.isPlaying || tv.isPlaying
  const paused = !playing && (info.isPaused || tv.isPaused)
  const title = info.mediaTitle ?? tv.mediaTitle
  const app = friendlyAppName(
    tv.appName ?? tv.currentSource ?? info.appName ?? info.currentSource,
  )
  const onHomeScreen = !app || HOME_APP.test(app)
  const isOn = tv.isOn || playing || paused

  const active = isOn && (playing || paused || Boolean(title) || !onHomeScreen)
  // Artwork, progress and timing come from whichever player published the title.
  const source = info.mediaTitle ? info : tv

  return { active, playing, paused, title, app, source, tv }
}
