import { Link, useRouterState } from '@tanstack/react-router'
import { Music2, Pause, Play } from 'lucide-react'
import { useMemo } from 'react'
import { MediaArt } from '#/components/media/MediaArt'
import { notify } from '#/components/ui/toast'
import { haUrl } from '#/config/ha'
import { useActiveMedia } from '#/hooks/useActiveMedia'
import { useOptimisticValue } from '#/hooks/useOptimisticValue'
import { cn } from '#/lib/cn'
import { AnimatePresence, m, slideUp, snappy, tap } from '#/lib/motion'
import { playerArtSources } from '#/lib/musicAssistant'

/**
 * Floating player card above the nav while music plays (hidden on the Music page).
 * `data-now-playing` reserves room for it via `--now-playing-space` in styles.css.
 */
export function NowPlayingBar() {
  const media = useActiveMedia()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { value: isPlaying, commit } = useOptimisticValue(media.isPlaying)

  const visible = media.isActive && !pathname.startsWith('/media')

  const toggle = () => {
    const next = !isPlaying
    commit(next, async () => {
      try {
        if (isPlaying) await media.player.pause()
        else await media.player.play()
      } catch (e) {
        notify('Music failed', e instanceof Error ? e.message : 'Error')
        throw e
      }
    })
  }

  const artKey = playerArtSources(media.player.attributes, haUrl).join('|')
  // biome-ignore lint/correctness/useExhaustiveDependencies: artKey is the by-value key
  const artSources = useMemo(() => (artKey ? artKey.split('|') : []), [artKey])

  const title = media.mediaTitle ?? 'Playing'
  const subtitle =
    [media.mediaArtist, media.room].filter(Boolean).join(' · ') || media.room || 'Music'
  const duration = media.player.attributes.media_duration as number | undefined
  const position = media.player.attributes.media_position as number | undefined
  const progress = duration && position != null ? Math.min(100, (position / duration) * 100) : 0

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <m.div
          key="now-playing"
          data-now-playing
          initial={slideUp.initial}
          animate={slideUp.animate}
          exit={slideUp.exit}
          transition={slideUp.transition}
          className={cn(
            // Use left/right (not inset-x): inset-inline fights md:left-* and spilled under the rail.
            'fixed right-0 bottom-[calc(var(--nav-clearance)+var(--nav-gap))] left-0 z-30 px-3 sm:px-5',
            'md:right-0 md:bottom-4 md:left-[5.5rem] md:px-8 lg:left-60 lg:px-10',
          )}
        >
            <div
              className={cn(
                'relative mx-auto flex w-full max-w-[80rem] items-center gap-3 overflow-hidden rounded-card border-ui border-border bg-canvas-elevated/92 p-2 shadow-sheet backdrop-blur-xl',
                'modern:rounded-pill modern:border-0 modern:bg-accent modern:text-on-accent',
                'glass:rounded-pill',
              )}
            >
              <Link to="/media" className="flex min-h-12 min-w-0 flex-1 items-center gap-3">
                <MediaArt
                  sources={artSources}
                  label=""
                  className="size-12 rounded-[calc(var(--r-card)-0.5rem)] bg-on text-on-ink shadow-none! modern:rounded-pill glass:rounded-pill"
                  fallback={
                    <span className="grid size-full place-items-center">
                      <Music2 className="size-5" />
                    </span>
                  }
                />
                <span className="min-w-0">
                  <span className="block truncate text-[0.9375rem] font-semibold">{title}</span>
                  <span className="block truncate text-[0.8125rem] text-ink-muted modern:text-on-accent/70">
                    {subtitle}
                  </span>
                </span>
              </Link>
              <m.button
                type="button"
                whileTap={tap.hard}
                transition={snappy}
                onClick={toggle}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="grid size-12 shrink-0 place-items-center rounded-pill bg-accent text-on-accent modern:bg-on-accent modern:text-accent"
              >
                {isPlaying ? (
                  <Pause className="size-5" fill="currentColor" />
                ) : (
                  <Play className="size-5" fill="currentColor" />
                )}
              </m.button>
              <span
                aria-hidden
                className="absolute bottom-0 left-0 h-0.5 bg-ink-muted modern:left-6 modern:bg-on-from"
                style={{ width: `${progress}%` }}
              />
            </div>
        </m.div>
      ) : null}
    </AnimatePresence>
  )
}
