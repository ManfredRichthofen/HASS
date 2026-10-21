import { Link } from '@tanstack/react-router'
import { useEntityGroup, useServiceCall } from 'hass-react'
import { LayoutGrid, Power } from 'lucide-react'
import { Temp, roomIcons } from '#/components/rooms/roomMeta'
import { notify } from '#/components/ui/toast'
import { type AreaConfig, areaDeviceCount, areaLightIds, areaTempId } from '#/config/dashboard'
import { cn } from '#/lib/cn'

/** Compact room row for the tablet master list. */
export function RoomListItem({ area, active }: { area: AreaConfig; active: boolean }) {
  const { callService } = useServiceCall()
  const lightIds = areaLightIds(area)
  const lights = useEntityGroup([...lightIds])
  const on = lights.filter((l) => l.state === 'on').length
  const isOn = on > 0
  const hasLights = lightIds.length > 0
  const Icon = roomIcons[area.id] ?? LayoutGrid
  const tempId = areaTempId(area)
  const deviceCount = areaDeviceCount(area)

  async function togglePower() {
    try {
      await callService('light', isOn ? 'turn_off' : 'turn_on', { entity_id: lightIds })
    } catch (e) {
      notify('Lights failed', e instanceof Error ? e.message : 'Error')
    }
  }

  const status = hasLights
    ? isOn
      ? lightIds.length > 1
        ? `${on} of ${lightIds.length} on`
        : 'Light on'
      : 'Lights off'
    : `${deviceCount} device${deviceCount === 1 ? '' : 's'}`

  return (
    <div
      className={cn(
        'relative flex min-h-16 items-center gap-3 rounded-2xl border p-2.5 transition-state',
        active ? 'border-accent/40 bg-accent-soft' : 'border-border-subtle bg-surface',
      )}
    >
      <Link
        to="/rooms/$areaId"
        params={{ areaId: area.id }}
        aria-label={`Open ${area.name}`}
        aria-current={active ? 'page' : undefined}
        className="absolute inset-0 z-[1] rounded-2xl"
      />
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-xl transition-state',
          isOn ? 'bg-on text-white' : 'bg-icon-well text-ink-muted',
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{area.name}</p>
        <p className="truncate text-xs text-ink-muted">
          {status}
          {tempId ? <Temp entityId={tempId} /> : null}
        </p>
      </div>
      {hasLights ? (
        <button
          type="button"
          onClick={() => void togglePower()}
          aria-label={`${isOn ? 'Turn off' : 'Turn on'} ${area.name} lights`}
          className={cn(
            'relative z-[2] grid size-11 shrink-0 place-items-center rounded-full transition-ui',
            isOn ? 'bg-on text-white' : 'bg-icon-well text-ink-muted hover:text-ink',
          )}
        >
          <Power className="size-5" />
        </button>
      ) : null}
    </div>
  )
}
