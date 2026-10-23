import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { MusicSearch } from '#/components/entities/MusicSearch'
import { QueueManager } from '#/components/entities/QueueManager'
import { SpeakerPicker, speakers, useGroupAll } from '#/components/media/SpeakerPicker'
import { Segmented } from '#/components/ui/segmented'
import { cn } from '#/lib/cn'
import { AnimatePresence, m, panelFade, staggerContainer, staggerItem } from '#/lib/motion'
import { mediaTargets } from '#/lib/musicAssistant'

export const Route = createFileRoute('/media')({ component: MusicPage })

type Panel = 'queue' | 'rooms' | 'search'

const panels = [
  { value: 'queue' as const, label: 'Up next' },
  { value: 'rooms' as const, label: 'Rooms' },
  { value: 'search' as const, label: 'Search' },
]

/**
 * Music fits one screen: the player stays put and everything else lives in
 * one panel (Up next / Rooms / Search) that scrolls on its own.
 * Phone: a compact player above the panel. Tablet: player left, panel right.
 */
function MusicPage() {
  const queryClient = useQueryClient()
  const [target, setTarget] = useState<string>(mediaTargets[0].id)
  const [panel, setPanel] = useState<Panel>('queue')
  const leader = target === 'media_player.all' ? (speakers[0]?.id ?? target) : target
  const groupAll = useGroupAll(leader)

  const refreshQueue = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['music-queue', target] })
  }, [queryClient, target])

  return (
    <m.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className={cn(
        '@container flex min-h-[32rem] flex-col gap-4',
        // Page height minus shell padding + bottom nav (phone) / padding (tablet).
        'h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom))] md:h-[calc(100dvh-8rem)]',
      )}
    >
      <m.header
        variants={staggerItem}
        className="flex shrink-0 items-end justify-between gap-3 pt-[max(0.25rem,env(safe-area-inset-top))]"
      >
        <h1 className="text-display text-[2.25rem] leading-none text-ink walnut:font-light md:text-[2.75rem]">
          Music
        </h1>
      </m.header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 @xl:grid @xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] @xl:gap-8">
        <m.div
          variants={staggerItem}
          className="min-h-0 shrink @xl:flex @xl:min-h-0 @xl:shrink @xl:flex-col @xl:justify-center"
        >
          <QueueManager
            view="player"
            target={target}
            onTargetChange={setTarget}
            artClassName="@xl:max-w-[min(100%,calc(100dvh-26rem))]"
          />
        </m.div>

        <m.section
          variants={staggerItem}
          aria-label="Music panel"
          className="flex min-h-[40%] flex-1 flex-col gap-3 @xl:min-h-0"
        >
          <Segmented label="Show" options={panels} value={panel} onChange={setPanel} />
          <div className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-card">
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={panel}
                initial={panelFade.initial}
                animate={panelFade.animate}
                exit={panelFade.exit}
                transition={panelFade.transition}
              >
                {panel === 'queue' ? (
                  <QueueManager view="queue" target={target} onTargetChange={setTarget} />
                ) : null}

                {panel === 'rooms' ? (
                  <div className="grid gap-5">
                    <div className="grid gap-2">
                      <span className="text-label">Controlling</span>
                      <Segmented
                        label="Controlling"
                        value={target}
                        onChange={setTarget}
                        options={mediaTargets.map((t) => ({ value: t.id, label: t.label }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-label">Playing in</span>
                        <button
                          type="button"
                          onClick={() => void groupAll()}
                          className="min-h-11 text-sm font-semibold text-ink-muted transition-ui hover:text-ink brutal:font-label brutal:text-xs brutal:uppercase brutal:underline"
                        >
                          Group all
                        </button>
                      </div>
                      <SpeakerPicker leader={leader} />
                    </div>
                  </div>
                ) : null}

                {panel === 'search' ? <MusicSearch target={target} onQueued={refreshQueue} /> : null}
              </m.div>
            </AnimatePresence>
          </div>
        </m.section>
      </div>
    </m.div>
  )
}
