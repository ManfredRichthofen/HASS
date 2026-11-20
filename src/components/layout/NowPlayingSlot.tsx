import { useRouterState } from '@tanstack/react-router'
import { lazy, Suspense, useEffect, useState } from 'react'
import { useActiveMedia } from '#/hooks/useActiveMedia'
import { useTvNowPlaying } from '#/hooks/useTvNowPlaying'

const NowPlayingBar = lazy(() =>
  import('#/components/layout/NowPlayingBar').then((mod) => ({ default: mod.NowPlayingBar })),
)

/**
 * Watches music + TV cheaply and only loads the Now Playing bar (art, TV remote drawer)
 * once something is actually playing. After that it stays mounted so its exit animation runs.
 */
export function NowPlayingSlot() {
  const media = useActiveMedia()
  const tvNow = useTvNowPlaying()
  const onMusicPage = useRouterState({ select: (s) => s.location.pathname.startsWith('/media') })
  const wanted = (tvNow.active && !media.isPlaying) || (media.isActive && !onMusicPage)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (wanted) setArmed(true)
  }, [wanted])

  if (!armed) return null
  return (
    <Suspense fallback={null}>
      <NowPlayingBar media={media} tvNow={tvNow} onMusicPage={onMusicPage} />
    </Suspense>
  )
}
