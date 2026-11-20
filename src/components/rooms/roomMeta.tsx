import { useSensor } from 'hass-react'
import {
  BedDouble,
  CookingPot,
  type LucideIcon,
  Monitor,
  Sofa,
  TreePine,
  Warehouse,
  WashingMachine,
} from 'lucide-react'

export const roomIcons: Record<string, LucideIcon> = {
  living_room: Sofa,
  kitchen: CookingPot,
  bedroom: BedDouble,
  office: Monitor,
  garage: Warehouse,
  laundry: WashingMachine,
  outside: TreePine,
}

/** Rounded room temperature; `separated` prefixes a " · " for inline summaries. */
export function RoomTemp({ entityId, separated }: { entityId: string; separated?: boolean }) {
  const temp = useSensor(entityId)
  if (temp.isUnavailable || temp.numericValue == null) return null
  const degrees = Math.round(temp.numericValue)
  const label = <span aria-label={`Temperature ${degrees} degrees`}>{degrees}°</span>
  return separated ? (
    <span>
      {' · '}
      {label}
    </span>
  ) : (
    label
  )
}
