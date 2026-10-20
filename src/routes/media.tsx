import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ListMusic, Search } from 'lucide-react'
import { useCallback, useState } from 'react'
import { MusicSearch } from '#/components/entities/MusicSearch'
import { QueueManager } from '#/components/entities/QueueManager'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'
import { cn } from '#/lib/cn'
import { mediaTargets } from '#/lib/musicAssistant'

export const Route = createFileRoute('/media')({ component: MediaPage })

type MobileTab = 'queue' | 'search'

function RoomChips({
  target,
  onTargetChange,
}: {
  target: string
  onTargetChange: (id: string) => void
}) {
  return (
    <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {mediaTargets.map((playerTarget) => (
        <button
          key={playerTarget.id}
          type="button"
          onClick={() => onTargetChange(playerTarget.id)}
          className={cn(
            'touch-target shrink-0 rounded-xl border px-3 text-xs font-medium transition-ui',
            target === playerTarget.id
              ? 'border-accent/40 bg-accent-soft text-accent'
              : 'border-border-subtle bg-surface text-ink-muted hover:text-ink',
          )}
        >
          {playerTarget.label}
        </button>
      ))}
    </div>
  )
}

function MobileTabs({ tab, onChange }: { tab: MobileTab; onChange: (tab: MobileTab) => void }) {
  const tabs = [
    { id: 'search' as const, label: 'Add music', Icon: Search },
    { id: 'queue' as const, label: 'Queue', Icon: ListMusic },
  ]
  return (
    <div
      role="tablist"
      className="grid grid-cols-2 gap-1 rounded-2xl border border-border-subtle bg-surface p-1 lg:hidden"
    >
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={tab === id}
          onClick={() => onChange(id)}
          className={cn(
            'touch-target flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-ui',
            tab === id ? 'bg-canvas-elevated text-accent shadow-sm' : 'text-ink-muted hover:text-ink',
          )}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  )
}

function MediaPage() {
  const queryClient = useQueryClient()
  const [target, setTarget] = useState<string>(mediaTargets[0].id)
  const [tab, setTab] = useState<MobileTab>('search')

  const refreshQueue = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['music-queue', target] })
  }, [queryClient, target])

  return (
    <Page>
      <PageHeader title="Media" subtitle="What's playing" />

      <Section>
        <RoomChips target={target} onTargetChange={setTarget} />
      </Section>

      <MobileTabs tab={tab} onChange={setTab} />

      <div className="grid items-start gap-5 lg:grid-cols-2 lg:gap-6">
        <Section className={cn(tab !== 'queue' && 'hidden lg:block')}>
          <QueueManager target={target} onTargetChange={setTarget} />
        </Section>

        <Section className={cn(tab !== 'search' && 'hidden lg:block', 'lg:sticky lg:top-4')}>
          <MusicSearch target={target} onQueued={refreshQueue} />
        </Section>
      </div>
    </Page>
  )
}
