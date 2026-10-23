import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ListMusic, Search, Speaker } from 'lucide-react'
import { type ReactNode, useCallback, useState } from 'react'
import { MusicSearch } from '#/components/entities/MusicSearch'
import { QueueManager } from '#/components/entities/QueueManager'
import {
  SpeakerChips,
  SpeakerPicker,
  speakers,
  useGroupAll,
} from '#/components/media/SpeakerPicker'
import { Drawer, DrawerContent } from '#/components/ui/drawer'
import { Segmented } from '#/components/ui/segmented'
import { cn } from '#/lib/cn'
import { AnimatePresence, m, panelFade, staggerContainer, staggerItem } from '#/lib/motion'
import { mediaTargets } from '#/lib/musicAssistant'

export const Route = createFileRoute('/media')({ component: MusicPage })

type Panel = 'queue' | 'search'
type Sheet = 'queue' | 'speakers' | 'search'

const panels = [
  { value: 'queue' as const, label: 'Up next' },
  { value: 'search' as const, label: 'Search' },
]

/**
 * Music fits one screen.
 * Phone: only the player — art, title, scrubber, transport, volume. Up next,
 * Speakers and Search are three buttons underneath that open sheets.
 * Tablet (@xl): the room switcher up top, player + speaker chips on the left,
 * Up next / Search on the right.
 */
function MusicPage() {
  const queryClient = useQueryClient()
  const [target, setTarget] = useState<string>(mediaTargets[0].id)
  const [panel, setPanel] = useState<Panel>('queue')
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const leader = target === 'media_player.all' ? (speakers[0]?.id ?? target) : target
  const targetLabel = mediaTargets.find((t) => t.id === target)?.label ?? 'Speakers'

  const refreshQueue = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['music-queue', target] })
  }, [queryClient, target])

  const controlling = (
    <Segmented
      label="Controlling"
      value={target}
      onChange={setTarget}
      options={mediaTargets.map((t) => ({ value: t.id, label: t.label }))}
    />
  )

  const sheetProps = (id: Sheet) => ({
    open: sheet === id,
    onOpenChange: (open: boolean) => setSheet(open ? id : null),
  })

  return (
    <m.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className={cn(
        '@container flex min-h-0 flex-col gap-4',
        // Page height minus shell padding + bottom nav (phone) / padding (tablet).
        'h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom))] md:h-[calc(100dvh-8rem)]',
      )}
    >
      <m.header
        variants={staggerItem}
        className="flex shrink-0 flex-col gap-2 pt-[max(0.25rem,env(safe-area-inset-top))]"
      >
        <h1 className="text-display text-[2rem] leading-none text-ink walnut:font-light md:text-[2.5rem]">
          Music
        </h1>
        <div className="hidden @xl:block">{controlling}</div>
      </m.header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 @xl:grid @xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] @xl:gap-6">
        {/* The player fills the column; its artwork shrinks to fit. */}
        <m.div variants={staggerItem} className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex min-h-0 flex-1 flex-col">
            <QueueManager view="player" target={target} onTargetChange={setTarget} />
          </div>
          <div className="hidden shrink-0 @xl:block">
            <SpeakerChips leader={leader} />
          </div>
        </m.div>

        {/* Phone: three quiet buttons, each opening a sheet. */}
        <m.nav
          variants={staggerItem}
          aria-label="Music"
          className="flex shrink-0 items-center gap-2 @xl:hidden"
        >
          <SheetButton icon={<ListMusic />} label="Up next" onClick={() => setSheet('queue')} />
          <SheetButton
            wide
            icon={<Speaker />}
            label={targetLabel}
            onClick={() => setSheet('speakers')}
          />
          <SheetButton icon={<Search />} label="Search" onClick={() => setSheet('search')} />
        </m.nav>

        {/* Tablet: Up next / Search beside the player. */}
        <m.section
          variants={staggerItem}
          aria-label="Music panel"
          className="hidden min-h-0 flex-col gap-2.5 @xl:flex"
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

                {panel === 'search' ? (
                  <MusicSearch target={target} onQueued={refreshQueue} />
                ) : null}
              </m.div>
            </AnimatePresence>
          </div>
        </m.section>
      </div>

      <Drawer {...sheetProps('queue')}>
        <DrawerContent>
          {sheet === 'queue' ? (
            <QueueManager view="queue" endlessToggle target={target} onTargetChange={setTarget} />
          ) : null}
        </DrawerContent>
      </Drawer>

      <Drawer {...sheetProps('speakers')}>
        <DrawerContent title="Speakers">
          {sheet === 'speakers' ? (
            <SpeakersSheet leader={leader} controlling={controlling} />
          ) : null}
        </DrawerContent>
      </Drawer>

      <Drawer {...sheetProps('search')}>
        <DrawerContent title="Search" className="h-[88dvh]">
          {sheet === 'search' ? <MusicSearch target={target} onQueued={refreshQueue} /> : null}
        </DrawerContent>
      </Drawer>
    </m.div>
  )
}

/** Up next and Search are round icon buttons; the speaker pill between them names the room. */
function SheetButton({
  icon,
  label,
  onClick,
  wide = false,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  wide?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'press flex h-12 min-w-0 items-center justify-center gap-2 rounded-pill text-sm font-semibold text-ink transition-ui',
        wide ? 'flex-1 px-4' : 'w-12 shrink-0',
        'bg-surface hover:bg-surface-hover [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-ink-muted',
        'walnut:border-ui walnut:border-border-subtle glass:bg-raised glass:text-on-raised glass:[&_svg]:text-on-raised',
        'brutal:rounded-none brutal:border-2 brutal:border-ink brutal:font-label brutal:text-xs brutal:uppercase brutal:[&_svg]:text-ink',
      )}
    >
      {icon}
      <span className={wide ? 'truncate' : 'sr-only'}>{label}</span>
    </button>
  )
}

/** Which player you control, and every room it plays in with its own volume. */
function SpeakersSheet({ leader, controlling }: { leader: string; controlling: ReactNode }) {
  const groupAll = useGroupAll(leader)
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <span className="text-label">Controlling</span>
        {controlling}
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
  )
}
