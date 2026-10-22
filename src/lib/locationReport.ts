/**
 * Location updates via a trigger-based Template device_tracker webhook.
 * Official HA replacement for deprecated `device_tracker.see` (removed in 2027.5).
 *
 * Each Casa install/device uses its own webhook_id + tracker entity so multiple
 * people in the household can share location independently.
 *
 * @see https://www.home-assistant.io/integrations/template/#device-tracker
 */

import { haUrl } from '#/config/ha'
import {
  getLocationWebhookId,
  locationTrackerEntityId,
  locationWebhookIdForDevice,
} from '#/lib/deviceLocation'

export { locationTrackerEntityId, locationWebhookIdForDevice }

/** YAML for this device — each household member pastes their own snippet once. */
export function buildLocationTemplateYaml(opts: {
  deviceId: string
  displayName: string
  webhookId?: string
}) {
  const webhookId = opts.webhookId ?? locationWebhookIdForDevice(opts.deviceId)
  const entityId = locationTrackerEntityId(opts.deviceId)
  const name = yamlDoubleQuoted(opts.displayName.trim() || opts.deviceId)
  const uniqueId = `casa_location_${opts.deviceId}`

  return `template:
  - triggers:
      - trigger: webhook
        webhook_id: ${webhookId}
        allowed_methods:
          - POST
        local_only: false
    device_tracker:
      - name: ${name}
        unique_id: ${uniqueId}
        default_entity_id: ${entityId}
        latitude: "{{ trigger.json.latitude }}"
        longitude: "{{ trigger.json.longitude }}"
        location_accuracy: "{{ trigger.json.gps_accuracy | default(0) }}"
        attributes:
          battery: "{{ trigger.json.battery }}"
          host_name: "{{ trigger.json.host_name }}"
          device_id: "{{ trigger.json.device_id }}"`
}

function yamlDoubleQuoted(value: string) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

export type LocationWebhookPayload = {
  latitude: number
  longitude: number
  gps_accuracy?: number
  battery?: number
  host_name: string
  device_id: string
}

export function buildLocationWebhookPayload(
  lat: number,
  lon: number,
  accuracy: number | null,
  battery: number | null,
  hostName: string,
  deviceId: string,
): LocationWebhookPayload {
  const payload: LocationWebhookPayload = {
    latitude: lat,
    longitude: lon,
    host_name: hostName,
    device_id: deviceId,
  }
  if (accuracy != null) payload.gps_accuracy = Math.round(accuracy)
  if (battery != null) payload.battery = battery
  return payload
}

export function locationWebhookUrl(baseUrl: string, webhookId: string) {
  return `${baseUrl.replace(/\/$/, '')}/api/webhook/${encodeURIComponent(webhookId)}`
}

/** POST GPS to this device's Template device_tracker webhook (no auth token). */
export async function reportLocationViaWebhook(opts: {
  haUrl: string
  webhookId: string
  lat: number
  lon: number
  accuracy: number | null
  battery: number | null
  hostName: string
  deviceId: string
}): Promise<void> {
  const url = locationWebhookUrl(opts.haUrl, opts.webhookId)
  const body = buildLocationWebhookPayload(
    opts.lat,
    opts.lon,
    opts.accuracy,
    opts.battery,
    opts.hostName,
    opts.deviceId,
  )

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      text.trim() ||
        `Webhook ${opts.webhookId} returned ${res.status}. Add this device's Template device_tracker in Home Assistant first.`,
    )
  }
}

export function resolveLocationReportTarget(deviceId: string) {
  if (!haUrl) throw new Error('VITE_HA_URL is not configured')
  return {
    haUrl,
    webhookId: getLocationWebhookId(deviceId),
  }
}

export function locationWebhookErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? '')
  if (/404|not found|webhook/i.test(raw)) {
    return 'Add this device’s Template device_tracker webhook in Home Assistant (see Settings → This device).'
  }
  return raw || 'Failed to report location to HA'
}
