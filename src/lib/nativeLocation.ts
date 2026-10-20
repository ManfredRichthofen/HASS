import { invoke } from '@tauri-apps/api/core'
import { haUrl } from '#/config/ha'
import {
  getOrCreateLocationDeviceId,
  isTauri,
  setLocationDeviceId,
  setLocationDeviceName,
  slugifyDeviceId,
} from '#/lib/deviceLocation'
import { getHaClientId, readHaAuth } from '#/lib/haAuthStorage'

export type NativeTrackingCredentials = {
  haUrl: string
  accessToken: string
  refreshToken: string
  clientId: string
  deviceId: string
}

/** Resolve Android Settings device name and use it as the HA device_tracker id. */
export async function resolveAndroidTrackerIdentity(): Promise<{
  deviceId: string
  deviceName: string
}> {
  if (!isTauri()) {
    const deviceId = getOrCreateLocationDeviceId()
    return { deviceId, deviceName: 'Casa Web' }
  }

  const result = await invoke<{ name: string }>('location_tracking_get_device_name')
  const deviceName = result.name?.trim() || 'Android'
  const deviceId = slugifyDeviceId(deviceName)
  setLocationDeviceName(deviceName)
  setLocationDeviceId(deviceId)
  return { deviceId, deviceName }
}

function buildCredentials(): NativeTrackingCredentials {
  const auth = readHaAuth()
  if (!haUrl) throw new Error('VITE_HA_URL is not configured')
  if (!auth?.access_token) {
    throw new Error('Sign in to Home Assistant before enabling location automations')
  }

  return {
    haUrl,
    accessToken: auth.access_token,
    refreshToken: auth.refresh_token ?? '',
    clientId: getHaClientId(auth),
    deviceId: getOrCreateLocationDeviceId(),
  }
}

/** Starts Fused Location + WorkManager background sharing. */
export async function startNativeLocationTracking(): Promise<void> {
  if (!isTauri()) throw new Error('Native tracking requires the Casa Android app')
  await resolveAndroidTrackerIdentity()
  const credentials = buildCredentials()
  await invoke('location_tracking_start', { credentials })
}

export async function stopNativeLocationTracking(): Promise<void> {
  if (!isTauri()) return
  await invoke('location_tracking_stop')
}

/** Refresh HA tokens stored for the background worker (call when auth changes). */
export async function updateNativeLocationCredentials(): Promise<void> {
  if (!isTauri()) return
  await resolveAndroidTrackerIdentity().catch(() => {
    /* keep existing id */
  })
  const credentials = buildCredentials()
  await invoke('location_tracking_update_credentials', { credentials })
}
