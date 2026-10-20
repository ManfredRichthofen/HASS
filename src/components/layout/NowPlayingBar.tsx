import { Link, useRouterState } from '@tanstack/react-router'
import { useMediaPlayer } from 'hass-react'
import { Music2, Pause, Play } from 'lucide-react'
import { notify } from '#/components/ui/toast'
import { entities } from '#/config/dashboard'
import { AnimatePresence, m, slideUp, snappy, tap } from '#/lib/motion'

/** Floating mini player that hovers above the bottom nav while music is playing (hidden when paused). */
export function NowPlayingBar() {
  const player = useMediaPlayer(entities.mediaAll)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const visible = player.isPlaying && !pathname.startsWith('/media')

  async function toggle() {
    try {
      if (player.isPlaying) await player.pause()
      else await player.play()
    } catch (e) {
      notify('Music failed', e instanceof Error ? e.message : 'Error')
    }
  }

  const title = player.mediaTitle ?? 'Playing'
  const subtitle = player.mediaArtist ?? 'Everywhere'

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <>
          <div aria-hidden className="h-[5rem]" />
          <m.div
            key="now-playing"
            initial={slideUp.initial}
            animate={slideUp.animate}
            exit={slideUp.exit}
            transition={slideUp.transition}
            className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 mx-auto w-full max-w-[88rem] px-3 sm:px-5 md:px-8 lg:px-10"
          >
            <div className="flex items-center gap-1.5 rounded-[1.375rem] border border-border bg-surface/95 p-2 shadow-lg backdrop-blur-md">
              <Link
                to="/media"
                className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl"
              >
                <span
                  className={
                    'grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-white' +
                    (player.isPlaying ? ' animate-pulse' : '')
                  }
                >
                  <Music2 className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{title}</span>
                  <span className="block truncate text-xs text-ink-muted">{subtitle}</span>
                </span>
              </Link>
              <m.button
                type="button"
                whileTap={tap.hard}
                transition={snappy}
                onClick={() => void toggle()}
                aria-label={player.isPlaying ? 'Pause' : 'Play'}
                className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-canvas"
              >
                {player.isPlaying ? (
                  <Pause className="size-5" fill="currentColor" />
                ) : (
                  <Play className="size-5" fill="currentColor" />
                )}
              </m.button>
            </div>
          </m.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
