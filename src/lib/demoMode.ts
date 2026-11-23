import { type HAConnection, useStore } from 'hass-react'
import { simulateMusic, writeEntity } from '#/lib/demoMusic'

/**
 * Demo mode: stay connected to the real house for reads (rooms, states, history, queues)
 * but never send anything that changes it. Service calls are swallowed and simulated in the
 * local entity store so the UI reacts as if they ran.
 *
 * Read once at startup and never changes for the life of the page: turning it on or off
 * reloads the app. When it is off the only cost is a few `if (DEMO_MODE)` checks.
 */

const KEY = 'casa.demo'

function readDemo() {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export const DEMO_MODE = readDemo()

export function setDemoMode(enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    // Storage blocked: nothing to persist, reload will come back in the same mode.
  }
  window.location.reload()
}

// ---------------------------------------------------------------------------
// Read vs write classification
// ---------------------------------------------------------------------------

/** Music Assistant API commands that only read. Everything else is a write. */
const MASS_READ_COMMANDS = new Set([
  'player_queues/all',
  'player_queues/get',
  'player_queues/items',
  'player_queues/get_active_queue',
])

export function isMassReadCommand(command: string) {
  return MASS_READ_COMMANDS.has(command) || /\/(search|library_items|get_)/.test(command)
}

type Message = { type: string; [key: string]: unknown }

/** Service calls that only return data (forecasts, searches, queue lookups). */
function isReadOnlyServiceCall(msg: Message) {
  if (!msg.return_response) return false
  const service = String(msg.service ?? '')
  if (/^(get|search)/.test(service)) return true
  if (service === 'send_command') {
    const data = msg.service_data as { command?: unknown } | undefined
    return typeof data?.command === 'string' && isMassReadCommand(data.command)
  }
  return false
}

/** Websocket message types that never change anything. */
function isWriteMessage(msg: Message) {
  if (msg.type === 'call_service') return !isReadOnlyServiceCall(msg)
  if (msg.type === 'execute_script' || msg.type === 'fire_event') return true
  return /(^|\/)(create|update|delete|remove)\b/.test(msg.type)
}

// ---------------------------------------------------------------------------
// Local simulation
// ---------------------------------------------------------------------------

type Attrs = Record<string, unknown>
type Next = { state: string; attributes: Attrs } | null

function simulate(domain: string, service: string, state: string, attrs: Attrs, data: Attrs): Next {
  const on = (extra: Attrs = {}) => ({ state: 'on', attributes: { ...attrs, ...extra } })
  const off = () => ({ state: 'off', attributes: attrs })
  const with_ = (extra: Attrs) => ({ state, attributes: { ...attrs, ...extra } })

  // Lights carry brightness, so a toggle runs as a real turn_on / turn_off.
  if (domain === 'light' && service === 'toggle') {
    return simulate(domain, state === 'on' ? 'turn_off' : 'turn_on', state, attrs, data)
  }
  if (service === 'toggle') return state === 'on' ? off() : on()

  switch (domain) {
    case 'light': {
      if (service === 'turn_off') {
        // Like HA: an off light reports no brightness and remembers it as off_brightness.
        const remembered = attrs.brightness ?? attrs.off_brightness ?? null
        return {
          state: 'off',
          attributes: { ...attrs, brightness: null, off_brightness: remembered },
        }
      }
      if (service !== 'turn_on') return null
      const extra: Attrs = {}
      if (typeof data.brightness === 'number') extra.brightness = data.brightness
      if (typeof data.brightness_pct === 'number')
        extra.brightness = Math.round((data.brightness_pct / 100) * 255)
      if (data.color_temp_kelvin != null) {
        extra.color_temp_kelvin = data.color_temp_kelvin
        extra.color_mode = 'color_temp'
      }
      if (data.rgb_color != null) {
        extra.rgb_color = data.rgb_color
        extra.color_mode = 'rgb'
      }
      if (data.effect != null) extra.effect = data.effect === 'off' ? null : data.effect
      // Turning on without a level restores the last one, as the real light would.
      if (extra.brightness == null && attrs.brightness == null) {
        extra.brightness = typeof attrs.off_brightness === 'number' ? attrs.off_brightness : 255
      }
      return on(extra)
    }
    case 'fan': {
      if (service === 'turn_off') return off()
      if (service === 'turn_on')
        return on(data.percentage != null ? { percentage: data.percentage } : {})
      if (service === 'set_percentage')
        return data.percentage === 0 ? off() : on({ percentage: data.percentage })
      if (service === 'set_preset_mode') return on({ preset_mode: data.preset_mode })
      if (service === 'oscillate') return with_({ oscillating: data.oscillating })
      if (service === 'set_direction') return with_({ direction: data.direction })
      return null
    }
    case 'lock':
      if (service === 'lock') return { state: 'locked', attributes: attrs }
      if (service === 'unlock' || service === 'open')
        return { state: 'unlocked', attributes: attrs }
      return null
    case 'cover':
      if (service === 'open_cover')
        return { state: 'open', attributes: { ...attrs, current_position: 100 } }
      if (service === 'close_cover')
        return { state: 'closed', attributes: { ...attrs, current_position: 0 } }
      if (service === 'set_cover_position') {
        const p = Number(data.position)
        return { state: p === 0 ? 'closed' : 'open', attributes: { ...attrs, current_position: p } }
      }
      return null
    case 'climate':
      if (service === 'set_hvac_mode') return { state: String(data.hvac_mode), attributes: attrs }
      if (service === 'turn_off') return off()
      if (service === 'turn_on')
        return {
          state: String(
            attrs.hvac_modes
              ? ((attrs.hvac_modes as string[]).find((m) => m !== 'off') ?? 'heat')
              : 'heat',
          ),
          attributes: attrs,
        }
      if (service === 'set_temperature') {
        const extra: Attrs = {}
        for (const k of ['temperature', 'target_temp_low', 'target_temp_high'])
          if (data[k] != null) extra[k] = data[k]
        return {
          state: typeof data.hvac_mode === 'string' ? data.hvac_mode : state,
          attributes: { ...attrs, ...extra },
        }
      }
      if (service === 'set_fan_mode') return with_({ fan_mode: data.fan_mode })
      if (service === 'set_preset_mode') return with_({ preset_mode: data.preset_mode })
      return null
    case 'vacuum':
      if (service === 'start') return { state: 'cleaning', attributes: attrs }
      if (service === 'pause') return { state: 'paused', attributes: attrs }
      if (service === 'stop') return { state: 'idle', attributes: attrs }
      if (service === 'return_to_base') return { state: 'returning', attributes: attrs }
      if (service === 'set_fan_speed') return with_({ fan_speed: data.fan_speed })
      return null
    case 'select':
    case 'input_select':
      return service === 'select_option' ? { state: String(data.option), attributes: attrs } : null
    case 'number':
    case 'input_number':
      return service === 'set_value' ? { state: String(data.value), attributes: attrs } : null
    case 'alarm_control_panel': {
      const map: Record<string, string> = {
        alarm_disarm: 'disarmed',
        alarm_arm_home: 'armed_home',
        alarm_arm_away: 'armed_away',
        alarm_arm_night: 'armed_night',
        alarm_arm_vacation: 'armed_vacation',
        alarm_trigger: 'triggered',
      }
      return map[service] ? { state: map[service], attributes: attrs } : null
    }
    case 'switch':
    case 'input_boolean':
    case 'automation':
    case 'siren':
    case 'humidifier':
      if (service === 'turn_on') return on()
      if (service === 'turn_off') return off()
      return null
    default:
      // scripts, scenes, remotes, music services: nothing local to reflect.
      return null
  }
}

function targetIds(msg: Message): string[] {
  const data = (msg.service_data as Attrs | undefined) ?? {}
  const target = (msg.target as Attrs | undefined) ?? {}
  // mass_queue services name the player as `entity`.
  const raw = data.entity_id ?? target.entity_id ?? data.entity
  if (!raw) return []
  return ([] as unknown[]).concat(raw).filter((id): id is string => typeof id === 'string')
}

function applyLocally(msg: Message) {
  const domain = String(msg.domain ?? '')
  const service = String(msg.service ?? '')
  const { entity_id: _id, ...data } = (msg.service_data as Attrs | undefined) ?? {}
  const store = useStore.getState()

  for (const id of targetIds(msg)) {
    if (simulateMusic(domain, service, id, data)) continue
    const current = store.entities.get(id)
    if (!current) continue
    // Group-level services like `homeassistant.turn_off` act per entity domain.
    const entityDomain = domain === 'homeassistant' ? id.split('.')[0] : domain
    const next = simulate(entityDomain, service, current.state, current.attributes as Attrs, data)
    if (next) writeEntity(id, next.state, next.attributes)
  }
}

// ---------------------------------------------------------------------------
// Connection guard
// ---------------------------------------------------------------------------

const guarded = new WeakSet<object>()

/**
 * Wrap the connection's `sendMessagePromise` so writes never leave the device.
 * Idempotent per connection object. Called before any child component can use it.
 */
export function guardConnection(connection: HAConnection | null) {
  if (!connection || guarded.has(connection)) return
  guarded.add(connection)

  const conn = connection as HAConnection & {
    sendMessagePromise: <T>(msg: Message) => Promise<T>
    sendMessage?: (msg: Message) => void
  }
  const send = conn.sendMessagePromise.bind(conn)

  conn.sendMessagePromise = (<T>(msg: Message): Promise<T> => {
    if (!isWriteMessage(msg)) return send<T>(msg)
    if (import.meta.env.DEV)
      console.info('[demo] blocked', msg.type, msg.domain ?? '', msg.service ?? '', msg)
    if (msg.type === 'call_service') {
      applyLocally(msg)
      return Promise.resolve(
        (msg.return_response
          ? { context: { id: 'demo' }, response: {} }
          : { context: { id: 'demo' } }) as T,
      )
    }
    return Promise.resolve(undefined as T)
  }) as typeof conn.sendMessagePromise

  // Fire-and-forget variant: same rule, no simulation needed.
  if (typeof conn.sendMessage === 'function') {
    const fire = conn.sendMessage.bind(conn)
    conn.sendMessage = (msg: Message) => {
      if (!isWriteMessage(msg)) fire(msg)
    }
  }
}
