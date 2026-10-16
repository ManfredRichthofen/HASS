import { createFileRoute } from '@tanstack/react-router'
import { entities } from '#/config/dashboard'
import { MediaPlayerRow } from '#/components/entities/MediaCard'
import { MusicSearch } from '#/components/entities/MusicSearch'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'

export const Route = createFileRoute('/media')({ component: MediaPage })

const players = [
  entities.mediaAll,
  'media_player.living_room',
  'media_player.kitchen',
  'media_player.living_room_tv',
]

function MediaPage() {
  return (
    <Page>
      <PageHeader title="Media" subtitle="Search, play, and control" />

      <Section>
        <MusicSearch />
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
