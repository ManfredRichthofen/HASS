import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEntityGroup, useServiceCall } from 'hass-react'
import { LayoutGrid, Power } from 'lucide-react'
import { useEffect } from 'react'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { AllLightsOff } from '#/components/rooms/AllLightsOff'
import { Temp, roomIcons } from '#/components/rooms/roomMeta'
import { notify } from '#/components/ui/toast'
import {
  type AreaConfig,
  areaDeviceCount,
  areaLightIds,
  areaTempId,
  primaryAreas,
} from '#/config/dashboard'
import { cn } from '#/lib/cn'
import { useMediaQuery } from '#/hooks/useMediaQuery'
import { m, snappy, staggerContainer, staggerItem, tap } from '#/lib/motion'

export const Route = createFileRoute('/rooms/')({ component: RoomsPage })

function RoomCard({ area }: { area: AreaConfig }) {
  const { callService } = useServiceCall()
  const lightIds = areaLightIds(area)
  const lights = useEntityGroup([...lightIds])
  const on = lights.filter((l) => l.state === 'on').length
  const hasLights = lightIds.length > 0
  const isOn = on > 0
  const Icon = roomIcons[area.id] ?? LayoutGrid
  const tempId = areaTempId(area)
  const deviceCount = areaDeviceCount(area)
  const hasClimate = (area.climateReadings?.length ?? 0) > 0 || area.sensors.length > 0

  async function togglePower() {
    try {
      await callService('light', isOn ? 'turn_off' : 'turn_on', {
        entity_id: lightIds,
      })
    } catch (e) {
      notify('Lights failed', e instanceof Error ? e.message : 'Error')
    }
  }

  const sensorOnly = deviceCount === 0 && hasClimate
  const status = hasLights
    ? lightIds.length > 1 && isOn
      ? `${on} of ${lightIds.length} on`
      : isOn
        ? 'Light on'
        : 'Lights off'
    : sensorOnly
      ? 'Sensors'
      : `${deviceCount} device${deviceCount === 1 ? '' : 's'}`

  return (
    <m.div
      variants={staggerItem}
      whileTap={tap.medium}
      transition={snappy}
      className={cn(
        'relative flex min-h-[9.75rem] flex-col justify-between rounded-3xl border p-4 transition-state',
        isOn ? 'bg-on border-transparent' : 'border-border-subtle bg-surface',
      )}
    >
      <Link
        to="/rooms/$areaId"
        params={{ areaId: area.id }}
        aria-label={`Open ${area.name}`}
        className="absolute inset-0 z-[1] rounded-3xl"
      />
      <span
        className={cn(
          'grid size-11 place-items-center rounded-2xl transition-state',
          isOn ? 'bg-white/20 text-white' : 'bg-icon-well text-ink-muted',
        )}
      >
        <Icon className="size-6" />
      </span>
      {hasLights ? (
        <button
          type="button"
          onClick={() => void togglePower()}
          aria-label={`${isOn ? 'Turn off' : 'Turn on'} ${area.name} lights`}
          className={cn(
            'absolute top-2.5 right-2.5 z-[2] grid size-11 place-items-center rounded-full transition-ui',
            isOn ? 'bg-white/20 text-white' : 'bg-white/5 text-ink-muted hover:text-ink',
          )}
        >
          <Power className="size-5" />
        </button>
      ) : null}
      <div className="min-w-0">
        <p className="truncate font-display text-[1.0625rem] font-bold tracking-tight">
          {area.name}
        </p>
        <p className={cn('truncate text-xs', isOn ? 'text-white/80' : 'text-ink-muted')}>
          {status}
          {tempId ? <Temp entityId={tempId} /> : null}
        </p>
      </div>
    </m.div>
  )
}

function RoomsPage() {
  const navigate = useNavigate()
  const wide = useMediaQuery('(min-width: 1280px)')

  // Wide layouts show the room list in the layout route, so open a room by default.
  useEffect(() => {
    if (wide && primaryAreas[0]) {
      void navigate({ to: '/rooms/$areaId', params: { areaId: primaryAreas[0].id }, replace: true })
    }
  }, [wide, navigate])

  if (wide) return null

  return (
    <m.div initial="initial" animate="animate" variants={staggerContainer}>
      <Page>
        <PageHeader title="Rooms" subtitle="Tap a room to open it" />
        <AllLightsOff />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {primaryAreas.map((area) => (
            <RoomCard key={area.id} area={area} />
          ))}
        </div>
      </Page>
    </m.div>
  )
}
