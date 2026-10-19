import { Link, useRouterState } from '@tanstack/react-router'
import { useMediaPlayer } from 'hass-react'
import { Music2, Pause, Play } from 'lucide-react'
import { notify } from '#/components/ui/toast'
import { entities } from '#/config/dashboard'
import { AnimatePresence, m, snappy, soft } from '#/lib/motion'

/** Floating mini player that hovers above the bottom nav while music is active. */
export function NowPlayingBar() {
  const player = useMediaPlayer(entities.mediaAll)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const active = player.isPlaying || player.isPaused
  const visible = active && !pathname.startsWith('/media')

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
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={soft}
            className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 mx-auto w-full max-w-2xl px-3"
          >
            <div className="flex items-center gap-1.5 rounded-[1.375rem] border border-white/10 bg-[#242d42]/90 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <Link
                to="/media"
                className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl"
              >
                <span
                  className={
                    'grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#ff8a4c] via-[#c04bff] to-[#4b6bff] text-white' +
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
                whileTap={{ scale: 0.9 }}
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
