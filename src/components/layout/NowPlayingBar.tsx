import { Link, useRouterState } from '@tanstack/react-router'
import { useServiceCall } from 'hass-react'
import { Minus, Music2, Pause, Play, Plus, Tv } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TvRemoteCard } from '#/components/entities/TvRemoteCard'
import { MediaArt } from '#/components/media/MediaArt'
import { Drawer, DrawerContent } from '#/components/ui/drawer'
import { notify } from '#/components/ui/toast'
import { entities } from '#/config/dashboard'
import { haUrl } from '#/config/ha'
import { useActiveMedia } from '#/hooks/useActiveMedia'
import { useOptimisticValue } from '#/hooks/useOptimisticValue'
import { useTvNowPlaying } from '#/hooks/useTvNowPlaying'
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

  const tvNow = useTvNowPlaying()
  const [remoteOpen, setRemoteOpen] = useState(false)
  const { callService } = useServiceCall()
  // TV wins the bar unless music is actively playing; tapping it opens the remote.
  const tvMode = tvNow.active && !media.isPlaying
  const shown = tvMode ? tvNow.source : media.player
  const { value: shownPlaying, commit: commitShown } = useOptimisticValue(
    tvMode ? tvNow.playing : media.isPlaying,
  )

  const visible = tvMode || (media.isActive && !pathname.startsWith('/media'))

  const toggle = () => {
    const next = !shownPlaying
    commitShown(next, async () => {
      try {
        if (tvMode && entities.tv.remoteId) {
          await callService('remote', 'send_command', {
            entity_id: entities.tv.remoteId,
            command: 'MEDIA_PLAY_PAUSE',
          })
        } else if (shownPlaying) await shown.pause()
        else await shown.play()
      } catch (e) {
        notify(tvMode ? 'TV failed' : 'Music failed', e instanceof Error ? e.message : 'Error')
        throw e
      }
    })
  }

  const nudgeVolume = async (dir: 1 | -1) => {
    try {
      if (tvMode) {
        await callService('remote', 'send_command', {
          entity_id: entities.tv.remoteId,
          command: dir > 0 ? 'VOLUME_UP' : 'VOLUME_DOWN',
        })
      } else {
        const next = Math.min(1, Math.max(0, (media.player.volumeLevel ?? 0) + dir * 0.05))
        await media.player.setVolume(next)
      }
    } catch (e) {
      notify('Volume failed', e instanceof Error ? e.message : 'Error')
    }
  }

  const artKey = playerArtSources(shown.attributes, haUrl).join('|')
  const artSources = useMemo(() => (artKey ? artKey.split('|') : []), [artKey])

  const title = tvMode ? (tvNow.title ?? tvNow.app ?? 'TV on') : (media.mediaTitle ?? 'Playing')
  const subtitle = tvMode
    ? [entities.tv.label, tvNow.title ? tvNow.app : null].filter(Boolean).join(' · ')
    : [media.mediaArtist, media.room].filter(Boolean).join(' · ') || media.room || 'Music'
  const duration = shown.attributes.media_duration as number | undefined
  const position = shown.attributes.media_position as number | undefined
  const progress = duration && position != null ? Math.min(100, (position / duration) * 100) : 0

  return (
    <>
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
              {tvMode ? (
                <button
                  type="button"
                  onClick={() => setRemoteOpen(true)}
                  aria-label="Open TV remote"
                  className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-[calc(var(--r-card)-0.5rem)] bg-on text-on-ink modern:rounded-pill glass:rounded-pill">
                    <Tv className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[0.9375rem] font-semibold">{title}</span>
                    <span className="block truncate text-[0.8125rem] text-ink-muted modern:text-on-accent/70">
                      {subtitle}
                    </span>
                  </span>
                </button>
              ) : (
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
              )}
              {[-1, 1].map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => void nudgeVolume(dir as 1 | -1)}
                  aria-label={dir > 0 ? 'Volume up' : 'Volume down'}
                  className="touch-target hidden shrink-0 place-items-center rounded-pill text-ink-muted transition-ui hover:bg-surface-hover sm:grid modern:text-on-accent"
                >
                  {dir > 0 ? <Plus className="size-4" /> : <Minus className="size-4" />}
                </button>
              ))}
              <m.button
                type="button"
                whileTap={tap.hard}
                transition={snappy}
                onClick={toggle}
                aria-label={shownPlaying ? 'Pause' : 'Play'}
                className="grid size-12 shrink-0 place-items-center rounded-pill bg-accent text-on-accent modern:bg-on-accent modern:text-accent"
              >
                {shownPlaying ? (
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
      <Drawer open={remoteOpen && tvMode} onOpenChange={setRemoteOpen}>
        <DrawerContent title={entities.tv.label}>
          <TvRemoteCard bare entityId={entities.tv.id} remoteId={entities.tv.remoteId} />
        </DrawerContent>
      </Drawer>
    </>
  )
}
