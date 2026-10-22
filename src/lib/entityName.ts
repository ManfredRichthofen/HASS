/** Curated short labels for the dashboard. Prefer these over raw HA names. */
export const entityLabels: Record<string, string> = {
  // Living room lights
  'light.inovelli_vzm32_sn': 'Living Room lights',
  'light.doughnut_lamp': 'Doughnut lamp',
  'light.living_room_floor_light': 'Floor lamp',
  'light.entry': 'Entry',
  'light.living_room_led': 'LED strip',

  // Kitchen lights
  'light.kitchen_lights': 'Kitchen ceiling',
  'light.kitchen_under_cabinets': 'Kitchen counters',
  'light.kitchen_led': 'Kitchen LED',

  // Bedroom lights
  'light.bedroom_ceiling_light': 'Ceiling',

  // Fans
  'fan.mts300': 'Living room fan',
  'fan.bedroom_ceiling_fan': 'Ceiling fan',
  'fan.afg_smt_pro_2_0': 'Garage fan',

  // Climate / weather
  'climate.mts300': 'Thermostat',
  'weather.forecast_home': 'Weather',
  'sensor.outdoor_temperature': 'Outside',
  'sensor.mts300_temperature': 'Living room',
  'sensor.mts300_humidity': 'Living humidity',
  'sensor.presence_multi_sensor_fp300_temperature': 'Bedroom',
  'sensor.presence_multi_sensor_fp300_humidity': 'Bedroom humidity',
  'sensor.office_climate_sensor_temperature': 'Office',
  'sensor.office_climate_sensor_humidity': 'Office humidity',
  'sensor.afg_smt_pro_2_0_temperature': 'Garage',
  'sensor.afg_smt_pro_2_0_humidity': 'Garage humidity',
  'sensor.washer_current_status': 'Washer',
  'sensor.washtower_current_status': 'Dryer',
  'sensor.dishwasher_operation_state': 'Dishwasher',

  // Media
  'media_player.all': 'Everywhere',
  'media_player.living_room': 'Living Room',
  'media_player.kitchen': 'Kitchen',
  'media_player.living_room_tv': 'Bedroom TV',

  // Security / appliances / yard
  'lock.level_lock_pro': 'Front door',
  'camera.doorbell': 'Doorbell',
  'binary_sensor.doorbell_visitor': 'Doorbell',
  'binary_sensor.doorbell_motion': 'Doorbell motion',
  'vacuum.x40_ultra': 'Robot vacuum',
  'switch.washer_power': 'Washer',
  'switch.washtower_power': 'Dryer',
  'switch.dishwasher_power': 'Dishwasher',
  'switch.sprinkler_controller_front_lawn': 'Front lawn',
  'switch.sprinkler_controller_back_yard': 'Back yard',
  'switch.sprinkler_controller_front_small': 'Front beds',
  'switch.sprinkler_controller_rain_delay': 'Rain delay',
}

/** On/off-only lighting loads (no brightness/color drawer). */
export const simpleToggleLights = new Set(['light.living_room_led', 'light.kitchen_led'])

function titleCase(value: string) {
  return value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/** Collapse awkward HA names like "Light Light" / "Fan Fan". */
function cleanFriendlyName(name: string) {
  let cleaned = name.trim()

  cleaned = cleaned.replace(/\s+/g, ' ')
  cleaned = cleaned.replace(/\b(Light|Fan|Switch|Sensor)\s+\1\b/gi, '$1')
  cleaned = cleaned.replace(/\bBedroom\s+Bedroom\b/gi, 'Bedroom')
  cleaned = cleaned.replace(/\bLiving Room\s+Living Room\b/gi, 'Living Room')
  cleaned = cleaned.replace(/\bX40 Ultra\s+X40 Ultra\b/gi, 'Robot vacuum')
  cleaned = cleaned.replace(/\bLevel Lock Pro\b/gi, 'Front door')
  cleaned = cleaned.replace(/\bAFG SMT PRO-2\.0\b/gi, 'Garage fan')
  cleaned = cleaned.replace(/\bMTS300\b/gi, 'Living room')
  cleaned = cleaned.replace(/\bSprinkler Controller\s+/gi, '')
  cleaned = cleaned.replace(/\bPresence Multi-Sensor FP300\s+/gi, '')
  cleaned = cleaned.replace(/\bClimate Sensor\s+/gi, 'Office ')
  cleaned = cleaned.replace(/\bGE Profile Oven SNAD067566Q\s+/gi, 'Oven ')

  return cleaned.trim()
}

export function entityName(entityId: string, friendlyName?: string | null): string {
  if (entityLabels[entityId]) return entityLabels[entityId]
  if (friendlyName) return cleanFriendlyName(friendlyName)

  const [, objectId = entityId] = entityId.split('.')
  return titleCase(objectId.replace(/_/g, ' '))
}
