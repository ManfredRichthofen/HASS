import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { MediaPlayerRow } from '#/components/entities/MediaCard'
import { MusicSearch } from '#/components/entities/MusicSearch'
import { QueueManager } from '#/components/entities/QueueManager'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'
import { entities } from '#/config/dashboard'
import { mediaTargets } from '#/lib/musicAssistant'

export const Route = createFileRoute('/media')({ component: MediaPage })

const players = [
  entities.mediaAll,
  'media_player.living_room',
  'media_player.kitchen',
  'media_player.living_room_tv',
]

function MediaPage() {
  const queryClient = useQueryClient()
  const [target, setTarget] = useState<string>(mediaTargets[0].id)

  const refreshQueue = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['music-queue', target] })
  }, [queryClient, target])

  return (
    <Page>
      <PageHeader title="Media" subtitle="Queue, search, and control" />

      <Section>
        <QueueManager target={target} onTargetChange={setTarget} />
      </Section>

      <Section>
        <MusicSearch target={target} onTargetChange={setTarget} onQueued={refreshQueue} />
      </Section>

      <Section title="Players">
        <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2">
          {players.map((id) => (
            <MediaPlayerRow key={id} entityId={id} />
          ))}
        </div>
      </Section>
    </Page>
  )
}
