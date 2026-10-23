import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { AllLightsOff, useLightsOnCount } from '#/components/rooms/AllLightsOff'
import { RoomCard } from '#/components/rooms/RoomCard'
import { primaryAreas } from '#/config/dashboard'
import { useMediaQuery } from '#/hooks/useMediaQuery'
import { m, staggerContainer } from '#/lib/motion'

export const Route = createFileRoute('/rooms/')({ component: RoomsPage })

function RoomsPage() {
  const navigate = useNavigate()
  const wide = useMediaQuery('(min-width: 1280px)')
  const lightsOn = useLightsOnCount()

  // Desktop (xl) shows the room list in the layout route, so open a room by default.
  useEffect(() => {
    if (wide && primaryAreas[0]) {
      void navigate({ to: '/rooms/$areaId', params: { areaId: primaryAreas[0].id }, replace: true })
    }
  }, [wide, navigate])

  if (wide) return null

  return (
    <Page>
      <PageHeader
        eyebrow={`${primaryAreas.length} rooms`}
        title="Rooms"
        subtitle={
          lightsOn === 0 ? 'Every light is off' : `${lightsOn} light${lightsOn === 1 ? '' : 's'} on`
        }
        action={<AllLightsOff />}
      />
      <m.div
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="grid grid-cols-2 gap-3 @lg:grid-cols-3 @lg:gap-4 @3xl:grid-cols-4 brutal:gap-0 brutal:[&>*]:-mt-0.5 brutal:[&>*]:-ml-0.5 brutal:[&>*]:shadow-none"
      >
        {primaryAreas.map((area) => (
          <RoomCard key={area.id} area={area} />
        ))}
      </m.div>
    </Page>
  )
}
