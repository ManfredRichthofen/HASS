import { createFileRoute, Link } from '@tanstack/react-router'
import { EntityGrid } from '#/components/entities/EntityGrid'
import { LightTile } from '#/components/entities/LightTile'
import { SceneStrip } from '#/components/entities/SceneStrip'
import { HouseSummary } from '#/components/home/HouseSummary'
import { QuickDeviceRow } from '#/components/home/QuickDeviceRow'
import { Page } from '#/components/layout/Page'
import { Section } from '#/components/layout/Section'
import { entities, isRoomLight } from '#/config/dashboard'
import { m, staggerContainer, staggerItem } from '#/lib/motion'

export const Route = createFileRoute('/')({ component: HomePage })

/**
 * Home, in order: how the house is (a sentence) → quick changes (scenes) →
 * the lights you touch most → everything else.
 */
function HomePage() {
  return (
    <m.div initial="initial" animate="animate" variants={staggerContainer}>
      <Page>
        <div className="grid items-start gap-section @xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] @xl:gap-6">
          <m.div variants={staggerItem}>
            <HouseSummary />
          </m.div>

          <m.div variants={staggerItem} className="min-w-0">
            <Section title="Scenes">
              <SceneStrip />
            </Section>
          </m.div>

          <m.div variants={staggerItem} className="min-w-0">
            <Section title="Favourites" action={<Link to="/rooms">All rooms</Link>}>
              <EntityGrid>
                {entities.favorites.lights.filter(isRoomLight).map((id) => (
                  <LightTile key={id} entityId={id} />
                ))}
              </EntityGrid>
            </Section>
          </m.div>

          <m.div variants={staggerItem} className="min-w-0">
            <Section title="Around the house">
              <QuickDeviceRow />
            </Section>
          </m.div>
        </div>
      </Page>
    </m.div>
  )
}
