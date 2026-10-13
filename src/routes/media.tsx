import { createFileRoute } from '@tanstack/react-router'
import { entities } from '#/config/dashboard'
import { MediaCard } from '#/components/entities/MediaCard'
import { MusicSearch } from '#/components/entities/MusicSearch'
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
    <div>
      <PageHeader title="Media" subtitle="Search, play, and control" />

      <Section>
        <MusicSearch />
      </Section>

      <Section title="Now playing">
        <div className="grid gap-3 md:grid-cols-2">
          {players.map((id) => (
            <MediaCard key={id} entityId={id} />
          ))}
        </div>
      </Section>
    </div>
  )
}
