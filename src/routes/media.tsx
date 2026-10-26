import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ListMusic, Search, Speaker } from 'lucide-react'
import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { MusicSearch } from '#/components/entities/MusicSearch'
import { type GroupVolume, QueueManager } from '#/components/entities/QueueManager'
import { SpeakersPanel } from '#/components/media/SpeakersPanel'
import { Drawer, DrawerContent } from '#/components/ui/drawer'
import { Segmented } from '#/components/ui/segmented'
import { useGroupActions, useMusicSessions } from '#/hooks/useMusicSessions'
import { cn } from '#/lib/cn'
import { AnimatePresence, m, panelFade, staggerContainer, staggerItem } from '#/lib/motion'

export const Route = createFileRoute('/media')({ component: MusicPage })

type Panel = 'queue' | 'speakers' | 'search'

const panels = [
  { value: 'queue' as const, label: 'Up next' },
  { value: 'speakers' as const, label: 'Speakers' },
  { value: 'search' as const, label: 'Search' },
]

/**
 * Music fits one screen.
 * Phone: only the player — art, title, scrubber, transport, volume. Up next,
 * Speakers and Search are three buttons underneath that open sheets.
 * Tablet (@xl): Up next / Speakers / Search as a tabbed panel — beside the
 * player in landscape, below it in portrait.
 *
 * The page always shows what is actually playing (a playing room beats a
 * paused one beats an idle one) until you choose something else in Speakers.
 */
function MusicPage() {
  const queryClient = useQueryClient()
  const { rooms, sessions } = useMusicSessions()
  const actions = useGroupActions()
  const [picked, setPicked] = useState<string | null>(null)
  const [panel, setPanel] = useState<Panel>('queue')
  const [sheet, setSheet] = useState<Panel | null>(null)

  // `picked` is a room; follow it to whichever group it is in now.
  const pickedLeader = picked ? (rooms.find((r) => r.id === picked)?.leader ?? picked) : null
  const current = sessions.find((s) => s.leader === pickedLeader) ?? sessions[0]
  const target = current?.leader ?? rooms[0]?.id ?? 'media_player.all'
  const label = current?.label ?? 'Speakers'

  const refreshQueue = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['music-queue', target] })
  }, [queryClient, target])

  // Several rooms together: the player's volume moves them all, keeping their balance.
  const groupVolume = useMemo<GroupVolume | undefined>(() => {
    const members = rooms.filter((r) => current?.members.includes(r.id))
    if (members.length < 2) return undefined
    const average = members.reduce((sum, r) => sum + r.volume, 0) / members.length
    const muted = members.every((r) => r.muted)
    return {
      value: Math.round(average),
      muted,
      set: async (value) => {
        const delta = value - average
        await Promise.all(
          members.map((r) =>
            actions.volume(r.id, Math.max(0, Math.min(100, Math.round(r.volume + delta)))),
          ),
        )
      },
      toggleMute: () =>
        actions.mute(
          members.map((r) => r.id),
          !muted,
        ),
    }
  }, [rooms, current, actions])

  const control = (id: string) => {
    setPicked(id)
    setSheet(null)
    setPanel('queue')
  }

  const speakersPanel = current ? (
    <SpeakersPanel current={current} onControl={control} onFollow={setPicked} />
  ) : null

  const sheetProps = (id: Panel) => ({
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
        // Page height minus the shell's padding: top + bottom nav on phone (the
        // floating nav in Modern / Glass is shorter), padding only from md up.
        '[--chrome:7.5rem] modern:[--chrome:6.25rem] glass:[--chrome:6.25rem]',
        'h-[calc(100dvh-var(--chrome)-env(safe-area-inset-bottom))] md:h-[calc(100dvh-4.5rem)]',
      )}
    >
      <m.header
        variants={staggerItem}
        className="flex shrink-0 flex-col gap-3 pt-[max(0.25rem,env(safe-area-inset-top))] @xl:flex-row @xl:items-center @xl:justify-between @xl:gap-6"
      >
        <h1 className="text-display text-[2rem] leading-none text-ink walnut:font-light md:text-[2.5rem]">
          Music
        </h1>
        <button
          type="button"
          onClick={() => setPanel('speakers')}
          className="hidden min-h-11 max-w-xs items-center gap-2 rounded-pill bg-surface px-4 text-sm font-semibold text-ink shadow-card transition-ui hover:bg-surface-hover @xl:inline-flex walnut:border-ui walnut:border-border-subtle glass:bg-raised glass:text-on-raised"
        >
          <Speaker className="size-[18px] shrink-0 text-ink-muted glass:text-on-raised" />
          <span className="truncate">{label}</span>
        </button>
      </m.header>

      {/*
       * Phone: the player fills the screen.
       * Landscape tablet: player | Up next & Search, side by side.
       * Portrait tablet: a wide player on top, Up next & Search filling the rest.
       */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 @xl:gap-6 @xl:landscape:grid @xl:landscape:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <m.div
          variants={staggerItem}
          className="flex min-h-0 flex-1 flex-col gap-4 @xl:gap-5 @xl:portrait:flex-none"
        >
          <div className="flex min-h-0 flex-1 flex-col @xl:portrait:flex-none">
            <QueueManager
              view="player"
              target={target}
              onTargetChange={setPicked}
              groupVolume={groupVolume}
            />
          </div>
        </m.div>

        {/* Phone: three quiet buttons, each opening a sheet. */}
        <m.nav
          variants={staggerItem}
          aria-label="Music"
          className="flex shrink-0 items-center gap-2 @xl:hidden"
        >
          <SheetButton icon={<ListMusic />} label="Up next" onClick={() => setSheet('queue')} />
          <SheetButton wide icon={<Speaker />} label={label} onClick={() => setSheet('speakers')} />
          <SheetButton icon={<Search />} label="Search" onClick={() => setSheet('search')} />
        </m.nav>

        {/* Tablet: Up next / Search beside the player. */}
        <m.section
          variants={staggerItem}
          aria-label="Music panel"
          className="hidden min-h-0 flex-1 flex-col gap-3 @xl:flex"
        >
          <Segmented label="Show" options={panels} value={panel} onChange={setPanel} />
          <div className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={panel}
                initial={panelFade.initial}
                animate={panelFade.animate}
                exit={panelFade.exit}
                transition={panelFade.transition}
              >
                {panel === 'queue' ? (
                  <QueueManager
                    view="queue"
                    endlessToggle
                    heading={false}
                    target={target}
                    onTargetChange={setPicked}
                  />
                ) : null}

                {panel === 'speakers' ? speakersPanel : null}

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
            <QueueManager view="queue" endlessToggle target={target} onTargetChange={setPicked} />
          ) : null}
        </DrawerContent>
      </Drawer>

      <Drawer {...sheetProps('speakers')}>
        <DrawerContent title="Speakers">
          {sheet === 'speakers' ? speakersPanel : null}
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
      )}
    >
      {icon}
      <span className={wide ? 'truncate' : 'sr-only'}>{label}</span>
    </button>
  )
}
