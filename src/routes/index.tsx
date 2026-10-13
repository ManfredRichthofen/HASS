import { createFileRoute } from '@tanstack/react-router'
import { useCurrentUser } from 'hass-react'
import { Sun } from 'lucide-react'
import { entities } from '#/config/dashboard'
import { EntityGrid } from '#/components/entities/EntityGrid'
import { LightTile } from '#/components/entities/LightTile'
import { SceneStrip } from '#/components/entities/SceneStrip'
import { ClimateSparkline } from '#/components/home/ClimateSparkline'
import { HomeStatusCard } from '#/components/home/HomeStatusCard'
import { QuickDeviceRow } from '#/components/home/QuickDeviceRow'
import { WeatherCard } from '#/components/home/WeatherCard'
import { Section } from '#/components/layout/Section'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const user = useCurrentUser()
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      <header className="mb-5 flex items-center justify-between gap-3 pt-[max(0.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
            <Sun className="size-4" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
              {greeting}
              {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
          </div>
        </div>
      </header>

      <Section>
        <HomeStatusCard />
      </Section>

      <Section>
        <WeatherCard />
      </Section>

      <Section title="Lights">
        <div className="mb-3">
          <SceneStrip />
        </div>
        <EntityGrid>
          {entities.favorites.lights.map((id) => (
            <LightTile key={id} entityId={id} />
          ))}
        </EntityGrid>
      </Section>

      <Section title="Climate">
        <ClimateSparkline />
      </Section>

      <Section title="Media & devices">
        <QuickDeviceRow />
      </Section>
    </div>
  )
}
