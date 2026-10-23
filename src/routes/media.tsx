import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { MusicSearch } from '#/components/entities/MusicSearch'
import { QueueManager } from '#/components/entities/QueueManager'
import { SpeakerPicker, speakers, useGroupAll } from '#/components/media/SpeakerPicker'
import { Segmented } from '#/components/ui/segmented'
import { cn } from '#/lib/cn'
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
    <div
      className={cn(
        '@container flex min-h-[32rem] flex-col gap-4',
        // Page height minus the shell's padding and the bottom nav (phone) / padding (tablet).
        'h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom))] md:h-[calc(100dvh-4.5rem)]',
      )}
    >
      <header className="flex shrink-0 items-end justify-between gap-3 pt-[max(0.25rem,env(safe-area-inset-top))]">
        <h1 className="text-display text-[2.25rem] leading-none text-ink walnut:font-light md:text-[2.75rem]">
          Music
        </h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 @2xl:grid @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] @2xl:gap-8">
        <div className="shrink-0 @2xl:flex @2xl:min-h-0 @2xl:flex-col @2xl:justify-center">
          <QueueManager
            view="player"
            target={target}
            onTargetChange={setTarget}
            artClassName="@2xl:max-w-[min(100%,calc(100dvh-26rem))]"
          />
        </div>

        <section aria-label="Music panel" className="flex min-h-0 flex-1 flex-col gap-3">
          <Segmented label="Show" options={panels} value={panel} onChange={setPanel} />
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-card">
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
                      className="min-h-11 text-sm font-semibold text-ink-muted hover:text-ink brutal:font-label brutal:text-xs brutal:uppercase brutal:underline"
                    >
                      Group all
                    </button>
                  </div>
                  <SpeakerPicker leader={leader} />
                </div>
              </div>
            ) : null}

            {panel === 'search' ? <MusicSearch target={target} onQueued={refreshQueue} /> : null}
          </div>
        </section>
      </div>
    </div>
  )
}
