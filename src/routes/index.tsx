import { createFileRoute } from '@tanstack/react-router'
import { useCurrentUser } from 'hass-react'
import { entities, isRoomLight } from '#/config/dashboard'
import { EntityGrid } from '#/components/entities/EntityGrid'
import { LightTile } from '#/components/entities/LightTile'
import { SceneStrip } from '#/components/entities/SceneStrip'
import { ClimateSparkline } from '#/components/home/ClimateSparkline'
import { HomeStatusCard } from '#/components/home/HomeStatusCard'
import { QuickDeviceRow } from '#/components/home/QuickDeviceRow'
import { WeatherCard } from '#/components/home/WeatherCard'
import { Page } from '#/components/layout/Page'
import { Section } from '#/components/layout/Section'
import { m, staggerContainer, staggerItem } from '#/lib/motion'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const user = useCurrentUser()
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <m.div initial="initial" animate="animate" variants={staggerContainer}>
      <Page>
        <m.header
          variants={staggerItem}
          className="pt-[max(0.25rem,env(safe-area-inset-top))]"
        >
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem] md:text-3xl">
            {greeting}
            {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
        </m.header>

        <m.div
          variants={staggerItem}
          className="grid gap-3 md:grid-cols-2 md:gap-4"
        >
          <HomeStatusCard />
          <WeatherCard />
        </m.div>

        <m.div variants={staggerItem}>
          <Section title="Lighting">
            <div className="mb-3">
              <SceneStrip />
            </div>
            <EntityGrid>
              {entities.favorites.lights.filter(isRoomLight).map((id) => (
                <LightTile key={id} entityId={id} />
              ))}
            </EntityGrid>
          </Section>
        </m.div>

        <m.div variants={staggerItem}>
          <ClimateSparkline />
        </m.div>

        <m.div variants={staggerItem}>
          <Section title="Devices">
            <QuickDeviceRow />
          </Section>
        </m.div>
      </Page>
    </m.div>
  )
}
