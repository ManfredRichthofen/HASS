import { Link, createFileRoute } from '@tanstack/react-router'
import { useEntityGroup, useSensor, useServiceCall } from 'hass-react'
import {
  BedDouble,
  CookingPot,
  LayoutGrid,
  Monitor,
  Power,
  Sofa,
  TreePine,
  Warehouse,
  WashingMachine,
  type LucideIcon,
} from 'lucide-react'
import {
  areaDeviceCount,
  areaLightIds,
  areaTempId,
  entities,
  isRoomLight,
  primaryAreas,
  type AreaConfig,
} from '#/config/dashboard'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { notify } from '#/components/ui/toast'
import { cn } from '#/lib/cn'
import { m, snappy, staggerContainer, staggerItem } from '#/lib/motion'

export const Route = createFileRoute('/rooms/')({ component: RoomsPage })

const roomIcons: Record<string, LucideIcon> = {
  living_room: Sofa,
  kitchen: CookingPot,
  bedroom: BedDouble,
  office: Monitor,
  garage: Warehouse,
  laundry: WashingMachine,
  outside: TreePine,
}

const allLights = (entities.allLightsOff as readonly string[]).filter(
  isRoomLight,
)

function Temp({ entityId }: { entityId: string }) {
  const temp = useSensor(entityId)
  if (temp.isUnavailable || temp.numericValue == null) return null
  return <span>{` · ${Math.round(temp.numericValue)}°`}</span>
}

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
  const hasClimate =
    (area.climateReadings?.length ?? 0) > 0 || area.sensors.length > 0

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
      whileTap={{ scale: 0.97 }}
      transition={snappy}
      className={cn(
        'relative flex min-h-[9.75rem] flex-col justify-between rounded-3xl border p-4 transition-colors duration-300',
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
          'grid size-11 place-items-center rounded-2xl transition-colors duration-300',
          isOn ? 'bg-white/20 text-white' : 'bg-[#252e40] text-ink-muted',
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
            'absolute top-2.5 right-2.5 z-[2] grid size-11 place-items-center rounded-full transition',
            isOn
              ? 'bg-white/20 text-white'
              : 'bg-white/5 text-ink-muted hover:text-ink',
          )}
        >
          <Power className="size-5" />
        </button>
      ) : null}
      <div className="min-w-0">
        <p className="truncate font-display text-[1.0625rem] font-bold tracking-tight">
          {area.name}
        </p>
        <p
          className={cn(
            'truncate text-xs',
            isOn ? 'text-white/80' : 'text-ink-muted',
          )}
        >
          {status}
          {tempId ? <Temp entityId={tempId} /> : null}
        </p>
      </div>
    </m.div>
  )
}

function AllLightsOff() {
  const { callService } = useServiceCall()
  const lights = useEntityGroup([...allLights])
  const on = lights.filter((l) => l.state === 'on').length

  async function turnOff() {
    try {
      await callService('light', 'turn_off', { entity_id: allLights })
    } catch (e) {
      notify('Lights failed', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <m.button
      variants={staggerItem}
      type="button"
      disabled={on === 0}
      onClick={() => void turnOff()}
      whileTap={{ scale: 0.98 }}
      transition={snappy}
      className={cn(
        'flex min-h-13 w-full items-center justify-center gap-2.5 rounded-2xl text-[0.9375rem] font-bold transition',
        on === 0
          ? 'bg-surface text-ink-faint'
          : 'bg-surface text-ink hover:bg-surface-hover',
      )}
    >
      <Power className="size-5" />
      {on === 0 ? 'All lights are off' : `Turn off all lights (${on} on)`}
    </m.button>
  )
}

function RoomsPage() {
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
