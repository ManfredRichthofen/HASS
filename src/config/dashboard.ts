export type AreaId =
  | 'living_room'
  | 'kitchen'
  | 'bedroom'
  | 'office'
  | 'garage'
  | 'laundry'
  | 'outside'
  | 'bathroom'
  | 'master_bath'
  | 'guest_bedroom'

/** Temp (+ humidity / occupancy) from one physical sensor on a single card. */
export type ClimateReading = {
  label: string
  tempId: string
  humidityId?: string
  occupancyId?: string
}

/** Ceiling fan + light kit — both entities on one card. */
export type FanLightKit = {
  label: string
  lightId: string
  fanId: string
}

/** Fan that shares a chassis with climate sensors (thermostat, evaporative cooler). */
export type FanDevice = {
  label: string
  fanId: string
  tempId?: string
  humidityId?: string
}

export interface AreaConfig {
  id: AreaId
  name: string
  /** Standalone lights (not part of a fanLights kit). */
  lights: string[]
  /** Standalone fans (not part of fanLights / fanDevices). */
  fans: string[]
  media: string[]
  /** Standalone unpaired sensors — prefer climateReadings / fanDevices. */
  sensors: string[]
  occupancy?: string
  /** Paired climate sensors for one device. */
  climateReadings?: ClimateReading[]
  /** Fan + light kits (same physical fixture). */
  fanLights?: FanLightKit[]
  /** Fans with on-device climate sensors. */
  fanDevices?: FanDevice[]
  /** Appliances with a power switch + cycle status sensor. */
  appliances?: { label: string; powerId: string; statusId: string }[]
  /** Extra on/off switches (irrigation zones etc.). */
  switches?: string[]
}

export const areas: AreaConfig[] = [
  {
    id: 'living_room',
    name: 'Living Room',
    lights: [
      'light.inovelli_vzm32_sn',
      'light.doughnut_lamp',
      'light.living_room_floor_light',
      'light.entry',
      'light.living_room_led',
    ],
    fans: [],
    // Thermostat fan + its temp/humidity on one card.
    fanDevices: [
      {
        label: 'Living room fan',
        fanId: 'fan.mts300',
        tempId: 'sensor.mts300_temperature',
        humidityId: 'sensor.mts300_humidity',
      },
    ],
    media: ['media_player.living_room'],
    sensors: [],
    occupancy: 'binary_sensor.inovelli_vzm32_sn_occupancy',
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    lights: ['light.kitchen_lights', 'light.kitchen_under_cabinets', 'light.kitchen_led'],
    fans: [],
    media: ['media_player.kitchen'],
    sensors: [],
    appliances: [
      {
        label: 'Dishwasher',
        powerId: 'switch.dishwasher_power',
        statusId: 'sensor.dishwasher_operation_state',
      },
    ],
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    // Ceiling kit is fanLights — paddle/controller LEDs stay out.
    lights: [],
    fans: [],
    fanLights: [
      {
        label: 'Ceiling',
        lightId: 'light.bedroom_ceiling_light',
        fanId: 'fan.bedroom_ceiling_fan',
      },
    ],
    // HA area is Living Room; friendly name is Bedroom TV — keep it with Bedroom.
    media: ['media_player.living_room_tv'],
    sensors: [],
    climateReadings: [
      {
        label: 'Bedroom',
        tempId: 'sensor.presence_multi_sensor_fp300_temperature',
        humidityId: 'sensor.presence_multi_sensor_fp300_humidity',
        occupancyId: 'binary_sensor.presence_multi_sensor_fp300_occupancy',
      },
    ],
    occupancy: 'binary_sensor.presence_multi_sensor_fp300_occupancy',
  },
  {
    id: 'office',
    name: 'Office',
    lights: [],
    fans: [],
    media: [],
    sensors: [],
    climateReadings: [
      {
        label: 'Office',
        tempId: 'sensor.office_climate_sensor_temperature',
        humidityId: 'sensor.office_climate_sensor_humidity',
        occupancyId: 'binary_sensor.casa_room_office_active',
      },
    ],
    occupancy: 'binary_sensor.casa_room_office_active',
  },
  {
    id: 'garage',
    name: 'Garage',
    lights: [],
    fans: [],
    // AFG cooler: fan + onboard climate on one card.
    fanDevices: [
      {
        label: 'Garage fan',
        fanId: 'fan.afg_smt_pro_2_0',
        tempId: 'sensor.afg_smt_pro_2_0_temperature',
        humidityId: 'sensor.afg_smt_pro_2_0_humidity',
      },
    ],
    media: [],
    sensors: [],
  },
  {
    id: 'laundry',
    name: 'Laundry',
    lights: [],
    fans: [],
    media: [],
    // Status lives on ApplianceRow — don't also chip them under Climate.
    sensors: [],
    appliances: [
      {
        label: 'Washer',
        powerId: 'switch.washer_power',
        statusId: 'sensor.washer_current_status',
      },
      {
        label: 'WashTower',
        powerId: 'switch.washtower_power',
        statusId: 'sensor.washtower_current_status',
      },
    ],
  },
  {
    id: 'outside',
    name: 'Outside',
    lights: [],
    fans: [],
    media: [],
    sensors: [],
    climateReadings: [{ label: 'Outside', tempId: 'sensor.outdoor_temperature' }],
    switches: [
      'switch.sprinkler_controller_front_lawn',
      'switch.sprinkler_controller_back_yard',
      'switch.sprinkler_controller_front_small',
      'switch.sprinkler_controller_rain_delay',
    ],
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    lights: [],
    fans: [],
    media: [],
    sensors: [],
  },
  {
    id: 'master_bath',
    name: 'Master Bath',
    lights: [],
    fans: [],
    media: [],
    sensors: [],
  },
  {
    id: 'guest_bedroom',
    name: 'Guest Bedroom',
    lights: [],
    fans: [],
    media: [],
    sensors: [],
  },
]

/** House-wide climate reading cards (Climate page). */
export const houseClimateReadings: ClimateReading[] = [
  {
    label: 'Living room',
    tempId: 'sensor.mts300_temperature',
    humidityId: 'sensor.mts300_humidity',
  },
  {
    label: 'Bedroom',
    tempId: 'sensor.presence_multi_sensor_fp300_temperature',
    humidityId: 'sensor.presence_multi_sensor_fp300_humidity',
  },
  {
    label: 'Office',
    tempId: 'sensor.office_climate_sensor_temperature',
    humidityId: 'sensor.office_climate_sensor_humidity',
  },
  {
    label: 'Garage',
    tempId: 'sensor.afg_smt_pro_2_0_temperature',
    humidityId: 'sensor.afg_smt_pro_2_0_humidity',
  },
  { label: 'Outside', tempId: 'sensor.outdoor_temperature' },
]

export const entities = {
  climate: 'climate.mts300',
  weather: 'weather.forecast_home',
  outdoorTemp: 'sensor.outdoor_temperature',
  lock: 'lock.level_lock_pro',
  vacuum: 'vacuum.x40_ultra',
  /** Dreame map cameras — first available wins at runtime via discovery. */
  vacuumMapCameras: ['camera.x40_ultra_map', 'camera.x40_ultra_map_1'] as const,
  vacuumCleaningMode: 'select.x40_ultra_cleaning_mode',
  vacuumCleanGenius: 'select.x40_ultra_cleangenius',
  mediaAll: 'media_player.all',
  musicAssistantEntryId: '01M0JXBK1DAXVW3PR27P1TQDJZ',
  mediaPlayers: [
    { id: 'media_player.all', label: 'Everywhere' },
    { id: 'media_player.living_room', label: 'Living Room' },
    { id: 'media_player.kitchen', label: 'Kitchen' },
    { id: 'media_player.living_room_tv', label: 'Bedroom TV' },
  ],

  /** Common-area favorites only — bedroom stays in Rooms. */
  favorites: {
    lights: [
      'light.inovelli_vzm32_sn',
      'light.entry',
      'light.living_room_floor_light',
      'light.kitchen_under_cabinets',
      'light.kitchen_lights',
      'light.doughnut_lamp',
    ],
    fans: ['fan.mts300'],
  },
  /** Security page: door contact + leak sensors (hidden automatically if unavailable). */
  security: {
    doorContact: 'binary_sensor.level_lock_pro_door',
    leaks: [
      {
        id: 'binary_sensor.kitchen_dishwasher_leak_sensor',
        label: 'Dishwasher',
      },
      { id: 'binary_sensor.washer_leak_sensor', label: 'Washer' },
    ],
  },
  houseMode: 'input_select.house_mode',
  houseModeAuto: 'input_boolean.house_mode_auto',
  occupancyAny: 'binary_sensor.any_room_occupied',
  livingTemp: 'sensor.mts300_temperature',

  /** Lighting scenes shown on Home (matches the polished HA dashboard pattern). */
  lightScenes: [
    {
      id: 'daylight',
      label: 'Daylight',
      kind: 'actions' as const,
      actions: [
        {
          domain: 'light',
          service: 'turn_on',
          data: {
            entity_id: [
              'light.inovelli_vzm32_sn',
              'light.kitchen_lights',
              'light.kitchen_under_cabinets',
              'light.entry',
            ],
            brightness_pct: 100,
            color_temp_kelvin: 4500,
          },
        },
        {
          domain: 'light',
          service: 'turn_on',
          data: {
            entity_id: ['light.doughnut_lamp', 'light.living_room_floor_light'],
            brightness_pct: 90,
            color_temp_kelvin: 4200,
          },
        },
      ],
    },
    {
      id: 'relax',
      label: 'Relax',
      kind: 'actions' as const,
      actions: [
        {
          domain: 'light',
          service: 'turn_on',
          data: {
            entity_id: 'light.inovelli_vzm32_sn',
            brightness_pct: 35,
            color_temp_kelvin: 2700,
          },
        },
        {
          domain: 'light',
          service: 'turn_on',
          data: {
            entity_id: ['light.doughnut_lamp', 'light.living_room_floor_light'],
            brightness_pct: 45,
            color_temp_kelvin: 2500,
          },
        },
        {
          domain: 'light',
          service: 'turn_on',
          data: {
            entity_id: 'light.kitchen_under_cabinets',
            brightness_pct: 30,
          },
        },
        {
          domain: 'light',
          service: 'turn_off',
          data: { entity_id: ['light.kitchen_lights', 'light.entry'] },
        },
      ],
    },
    {
      id: 'movie',
      label: 'Movie',
      kind: 'actions' as const,
      actions: [
        {
          domain: 'light',
          service: 'turn_off',
          data: {
            entity_id: [
              'light.inovelli_vzm32_sn',
              'light.entry',
              'light.kitchen_lights',
              'light.kitchen_under_cabinets',
            ],
          },
        },
        {
          domain: 'light',
          service: 'turn_on',
          data: {
            entity_id: 'light.living_room_floor_light',
            brightness_pct: 18,
            color_temp_kelvin: 2200,
          },
        },
        {
          domain: 'light',
          service: 'turn_on',
          data: {
            entity_id: 'light.doughnut_lamp',
            brightness_pct: 22,
            color_temp_kelvin: 2200,
          },
        },
      ],
    },
    {
      id: 'off',
      label: 'Off',
      kind: 'lights_off' as const,
    },
  ],

  /** House-mode shortcuts (used on Security / More). */
  scenes: [
    {
      id: 'home',
      label: 'Home',
      kind: 'script' as const,
      entityId: 'script.house_mode_set_home',
    },
    {
      id: 'away',
      label: 'Away',
      kind: 'script' as const,
      entityId: 'script.house_mode_set_away',
    },
    {
      id: 'night',
      label: 'Night',
      kind: 'script' as const,
      entityId: 'script.house_mode_set_night',
    },
    {
      id: 'secure',
      label: 'Secure',
      kind: 'script' as const,
      entityId: 'script.casa_secure_house',
    },
  ],

  appliances: {
    washerPower: 'switch.washer_power',
    washerStatus: 'sensor.washer_current_status',
    washtowerPower: 'switch.washtower_power',
    washtowerStatus: 'sensor.washtower_current_status',
    dishwasherPower: 'switch.dishwasher_power',
    dishwasherStatus: 'sensor.dishwasher_operation_state',
  },
  sprinklers: [
    'switch.sprinkler_controller_front_lawn',
    'switch.sprinkler_controller_back_yard',
    'switch.sprinkler_controller_front_small',
    'switch.sprinkler_controller_rain_delay',
  ],
  houseModes: [
    { id: 'script.house_mode_set_home', label: 'Home' },
    { id: 'script.house_mode_set_away', label: 'Away' },
    { id: 'script.house_mode_set_night', label: 'Night' },
    { id: 'script.casa_secure_house', label: 'Secure' },
  ],

  /**
   * Real lighting loads only (`light.*`).
   * Excludes switch/controller LEDs, fan-speed-as-light, browser_mod screens, etc.
   */
  allLightsOff: [
    'light.inovelli_vzm32_sn',
    'light.doughnut_lamp',
    'light.living_room_floor_light',
    'light.entry',
    'light.living_room_led',
    'light.kitchen_lights',
    'light.kitchen_under_cabinets',
    'light.kitchen_led',
    'light.bedroom_ceiling_light',
  ],
} as const

/** light.* entities that are not room lighting loads. */
export const nonLightingLightEntities = new Set([
  'light.living_room_living_room_controller_light_1',
  'light.living_room_living_room_controller_light_2',
  'light.living_room_living_room_controller_light_3',
  'light.bedroom_bedroom_switch_light_1',
  'light.bedroom_bedroom_switch_light_2',
])

/** True only for curated room lighting loads in the light domain. */
export function isRoomLight(entityId: string): boolean {
  if (!entityId.startsWith('light.')) return false
  if (nonLightingLightEntities.has(entityId)) return false
  if (entityId.includes('browser_mod')) return false
  if (/fan.?speed/i.test(entityId)) return false
  return (entities.allLightsOff as readonly string[]).includes(entityId)
}

/** First temperature entity for a room summary card. */
export function areaTempId(area: AreaConfig): string | undefined {
  return (
    area.climateReadings?.[0]?.tempId ??
    area.fanDevices?.[0]?.tempId ??
    area.sensors.find((id) => id.includes('temperature'))
  )
}

/** Count of controllable / notable devices for room list status. */
export function areaDeviceCount(area: AreaConfig): number {
  return (
    area.lights.filter(isRoomLight).length +
    (area.fanLights?.length ?? 0) +
    area.fans.length +
    (area.fanDevices?.length ?? 0) +
    area.media.length +
    (area.appliances?.length ?? 0) +
    (area.switches?.length ?? 0)
  )
}

/** All light entity IDs in a room, including fan/light kits. */
export function areaLightIds(area: AreaConfig): string[] {
  return [...area.lights, ...(area.fanLights ?? []).map((kit) => kit.lightId)].filter(isRoomLight)
}

export function getArea(id: string): AreaConfig | undefined {
  return areas.find((area) => area.id === id)
}

export const primaryAreas = areas.filter((area) =>
  ['living_room', 'kitchen', 'bedroom', 'office', 'garage', 'laundry', 'outside'].includes(area.id),
)
