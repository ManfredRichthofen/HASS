/**
 * Android TV Remote reports the foreground app as a package id
 * (`com.netflix.ninja`) unless a name is configured in Home Assistant.
 * Translate known ids to the names people recognise.
 */
const KNOWN_APPS: Record<string, string> = {
  'com.netflix.ninja': 'Netflix',
  'com.netflix.mediaclient': 'Netflix',
  'com.google.android.youtube.tv': 'YouTube',
  'com.google.android.youtube.tvunplugged': 'YouTube TV',
  'com.google.android.youtube.tvkids': 'YouTube Kids',
  'com.google.android.apps.youtube.music': 'YouTube Music',
  'com.amazon.amazonvideo.livingroom': 'Prime Video',
  'com.disney.disneyplus': 'Disney+',
  'com.hbo.hbonow': 'HBO Max',
  'com.wbd.stream': 'Max',
  'com.hulu.livingroomplus': 'Hulu',
  'com.apple.atve.androidtv.appletv': 'Apple TV',
  'com.spotify.tv.android': 'Spotify',
  'com.plexapp.android': 'Plex',
  'org.jellyfin.androidtv': 'Jellyfin',
  'com.github.damontecres.wholphin': 'Wholphin',
  'com.google.android.tvlauncher': 'Home',
  'com.google.android.apps.tv.launcherx': 'Home',
  'com.google.android.katniss': 'Google Assistant',
  'com.android.vending': 'Play Store',
  'com.android.tv.settings': 'Settings',
  'com.google.android.videos': 'Google TV',
  'com.peacocktv.peacockandroid': 'Peacock',
  'com.cbs.ott': 'Paramount+',
  'com.amazon.avod.thirdpartyclient': 'Prime Video',
  'tv.twitch.android.app': 'Twitch',
  'com.sling': 'Sling',
  'com.crunchyroll.crunchyroid': 'Crunchyroll',
  'com.espn.score_center': 'ESPN',
}

const LOOKS_LIKE_PACKAGE = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+){2,}$/i

/** Words that carry no meaning in a package id when guessing a name. */
const NOISE = new Set([
  'com',
  'org',
  'net',
  'io',
  'tv',
  'app',
  'apps',
  'android',
  'androidtv',
  'google',
  'amazon',
  'ninja',
  'mediaclient',
  'livingroom',
  'atve',
  'client',
  'mobile',
])

function titleCase(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/** `com.netflix.ninja` → `Netflix`. Plain names ("Netflix") pass through untouched. */
export function friendlyAppName(raw: string | null | undefined): string | undefined {
  const value = raw?.trim()
  if (!value) return undefined
  const id = value.toLowerCase().replace(/\.debug$/, '')
  const known = KNOWN_APPS[id]
  if (known) return known
  if (!LOOKS_LIKE_PACKAGE.test(value)) return value

  const parts = value.split('.')
  const meaningful = parts.filter((part) => !NOISE.has(part.toLowerCase()))
  const guess = meaningful[0] ?? parts[parts.length - 1]
  return guess ? titleCase(guess) : value
}
