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

export function Temp({ entityId }: { entityId: string }) {
  const temp = useSensor(entityId)
  if (temp.isUnavailable || temp.numericValue == null) return null
  return <span>{` · ${Math.round(temp.numericValue)}°`}</span>
}
