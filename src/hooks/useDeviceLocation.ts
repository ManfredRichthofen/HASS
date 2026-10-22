import { useHAConnection } from 'hass-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  formatCoords,
  getLocationDeviceName,
  getLocationWebhookId,
  getOrCreateLocationDeviceId,
  isLocationSharingEnabled,
  isTauri,
  type LocationReportSnapshot,
  readBatteryPercent,
  readLastLocationReport,
  setLocationSharingEnabled,
  shouldReportLocation,
  writeLastLocationReport,
} from '#/lib/deviceLocation'
import {
  buildLocationTemplateYaml,
  locationTrackerEntityId,
  locationWebhookErrorMessage,
  reportLocationViaWebhook,
  resolveLocationReportTarget,
} from '#/lib/locationReport'
import { readHaAuth } from '#/lib/haAuthStorage'
import {
  resolveAndroidTrackerIdentity,
  startNativeLocationTracking,
  stopNativeLocationTracking,
  updateNativeLocationCredentials,
} from '#/lib/nativeLocation'

export type LocationPermission = PermissionState | 'unsupported' | 'unknown'

type GeoErrorCode = 'denied' | 'unavailable' | 'timeout' | 'unknown'

type TauriGeolocation = typeof import('@tauri-apps/plugin-geolocation')

function mapGeoError(error: GeolocationPositionError): {
  code: GeoErrorCode
  message: string
} {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        code: 'denied',
        message: 'Location permission denied in the browser',
      }
    case error.POSITION_UNAVAILABLE:
      return { code: 'unavailable', message: 'Position unavailable' }
    case error.TIMEOUT:
      return { code: 'timeout', message: 'Location request timed out' }
    default:
      return { code: 'unknown', message: error.message || 'Location error' }
  }
}

function toSnapshot(
  lat: number,
  lon: number,
  accuracy: number | null,
  battery: number | null,
): LocationReportSnapshot {
  return {
    at: Date.now(),
    lat,
    lon,
    accuracy: accuracy != null ? Math.round(accuracy) : null,
    battery,
  }
}

async function loadTauriGeo(): Promise<TauriGeolocation> {
  return import('@tauri-apps/plugin-geolocation')
}

export function useDeviceLocation() {
  const { connected } = useHAConnection()
  const native = isTauri()

  const [enabled, setEnabledState] = useState(false)
  const [permission, setPermission] = useState<LocationPermission>('unknown')
  const [deviceId, setDeviceId] = useState('')
  const [lastReport, setLastReport] = useState<LocationReportSnapshot | null>(null)
  const [reporting, setReporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lastReportRef = useRef<LocationReportSnapshot | null>(null)
  const reportingRef = useRef(false)

  useEffect(() => {
    setEnabledState(isLocationSharingEnabled())
    setDeviceId(getOrCreateLocationDeviceId())
    const last = readLastLocationReport()
    lastReportRef.current = last
    setLastReport(last)

    if (!native) return
    void resolveAndroidTrackerIdentity()
      .then(({ deviceId: id }) => setDeviceId(id))
      .catch(() => {
        /* keep stored / random id until tracking starts */
      })
  }, [native])

  useEffect(() => {
    if (native) {
      void loadTauriGeo()
        .then((geo) => geo.checkPermissions())
        .then((status) => {
          setPermission(
            status.location === 'granted'
              ? 'granted'
              : status.location === 'denied'
                ? 'denied'
                : 'prompt',
          )
        })
        .catch(() => setPermission('unknown'))
      return
    }

    if (!('permissions' in navigator) || !navigator.permissions?.query) {
      setPermission('geolocation' in navigator ? 'unknown' : 'unsupported')
      return
    }

    let cancelled = false
    let status: PermissionStatus | undefined

    const sync = (state: PermissionState) => {
      if (!cancelled) setPermission(state)
    }

    void navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((result) => {
        status = result
        sync(result.state)
        result.onchange = () => sync(result.state)
      })
      .catch(() => {
        if (!cancelled) setPermission('unknown')
      })

    return () => {
      cancelled = true
      if (status) status.onchange = null
    }
  }, [native])

  const reportToHa = useCallback(
    async (lat: number, lon: number, accuracy: number | null, force: boolean) => {
      if (reportingRef.current) return
      // Prefer an active HA session so we know the instance is reachable; webhooks
      // themselves do not require a bearer token.
      if (!connected && !native) return

      if (!shouldReportLocation({ lat, lon, accuracy }, lastReportRef.current, force)) {
        return
      }

      reportingRef.current = true
      setReporting(true)
      setError(null)

      try {
        const battery = await readBatteryPercent()
        const id = getOrCreateLocationDeviceId()
        const hostName = native
          ? (getLocationDeviceName() ?? 'Android')
          : 'Casa Web'
        const target = resolveLocationReportTarget(id)

        await reportLocationViaWebhook({
          ...target,
          lat,
          lon,
          accuracy,
          battery,
          hostName,
          deviceId: id,
        })

        const snapshot = toSnapshot(lat, lon, accuracy, battery)
        lastReportRef.current = snapshot
        writeLastLocationReport(snapshot)
        setLastReport(snapshot)
        setDeviceId(id)
      } catch (e) {
        const message = locationWebhookErrorMessage(e)
        setError(message)
        throw e instanceof Error ? e : new Error(message)
      } finally {
        reportingRef.current = false
        setReporting(false)
      }
    },
    [connected, native],
  )

  const ensureNativePermissions = useCallback(async () => {
    const geo = await loadTauriGeo()
    let status = await geo.checkPermissions()
    if (status.location === 'prompt' || status.location === 'prompt-with-rationale') {
      status = await geo.requestPermissions(['location'])
    }
    if (status.location !== 'granted') {
      setPermission('denied')
      throw new Error(
        'Location permission denied. In Android settings, set Location to Allow all the time.',
      )
    }
    setPermission('granted')
  }, [])

  const getWebPosition = useCallback(
    (force: boolean) =>
      new Promise<void>((resolve, reject) => {
        if (!('geolocation' in navigator)) {
          const message = 'Geolocation is not supported in this browser'
          setError(message)
          setPermission('unsupported')
          reject(new Error(message))
          return
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            void reportToHa(
              position.coords.latitude,
              position.coords.longitude,
              typeof position.coords.accuracy === 'number' ? position.coords.accuracy : null,
              force,
            )
              .then(resolve)
              .catch(reject)
          },
          (geoError) => {
            const mapped = mapGeoError(geoError)
            setError(mapped.message)
            if (mapped.code === 'denied') setPermission('denied')
            reject(new Error(mapped.message))
          },
          {
            enableHighAccuracy: true,
            maximumAge: force ? 0 : 30_000,
            timeout: 20_000,
          },
        )
      }),
    [reportToHa],
  )

  const getNativePosition = useCallback(
    async (force: boolean) => {
      await ensureNativePermissions()
      const geo = await loadTauriGeo()
      const pos = await geo.getCurrentPosition({
        enableHighAccuracy: true,
        maximumAge: force ? 0 : 30_000,
        timeout: 20_000,
      })
      await reportToHa(
        pos.coords.latitude,
        pos.coords.longitude,
        pos.coords.accuracy ?? null,
        force,
      )
    },
    [ensureNativePermissions, reportToHa],
  )

  const getCurrentPosition = useCallback(
    (force: boolean) => (native ? getNativePosition(force) : getWebPosition(force)),
    [getNativePosition, getWebPosition, native],
  )

  const setEnabled = useCallback(
    async (next: boolean): Promise<{ ok: true } | { ok: false; message: string }> => {
      if (!next) {
        setLocationSharingEnabled(false)
        setEnabledState(false)
        setError(null)
        if (native) {
          try {
            await stopNativeLocationTracking()
          } catch {
            /* ignore */
          }
        }
        return { ok: true }
      }

      try {
        if (native) {
          await ensureNativePermissions()
          await startNativeLocationTracking()
          try {
            await getNativePosition(true)
          } catch {
            /* worker still enqueued; UI snapshot optional */
          }
        } else {
          await getWebPosition(true)
        }

        setLocationSharingEnabled(true)
        setEnabledState(true)
        setPermission((prev) => (prev === 'denied' ? prev : 'granted'))
        return { ok: true }
      } catch (e) {
        setLocationSharingEnabled(false)
        setEnabledState(false)
        if (native) {
          try {
            await stopNativeLocationTracking()
          } catch {
            /* ignore */
          }
        }
        return {
          ok: false,
          message: e instanceof Error ? e.message : 'Location error',
        }
      }
    },
    [ensureNativePermissions, getNativePosition, getWebPosition, native],
  )

  const updateNow = useCallback(async () => {
    await getCurrentPosition(true)
  }, [getCurrentPosition])

  // Web: continuous watch while enabled + connected.
  useEffect(() => {
    if (native || !enabled || !connected) return
    if (!('geolocation' in navigator)) return

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        void reportToHa(
          position.coords.latitude,
          position.coords.longitude,
          typeof position.coords.accuracy === 'number' ? position.coords.accuracy : null,
          false,
        ).catch(() => {
          /* error state set in reportToHa */
        })
      },
      (geoError) => {
        const mapped = mapGeoError(geoError)
        setError(mapped.message)
        if (mapped.code === 'denied') {
          setPermission('denied')
          setLocationSharingEnabled(false)
          setEnabledState(false)
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 25_000,
      },
    )

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      void getWebPosition(false).catch(() => {
        /* ignore */
      })
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      navigator.geolocation.clearWatch(watchId)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [connected, enabled, getWebPosition, native, reportToHa])

  // Native: re-arm WorkManager after process death, then foreground watch for UI.
  useEffect(() => {
    if (!native || !enabled || !connected) return

    let cancelled = false
    const watchIdRef = { current: null as number | null }

    void (async () => {
      try {
        await ensureNativePermissions()
        await startNativeLocationTracking()
        if (cancelled) return

        const geo = await loadTauriGeo()
        const watchId = await geo.watchPosition(
          { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
          (pos) => {
            if (cancelled || !pos) return
            void reportToHa(
              pos.coords.latitude,
              pos.coords.longitude,
              pos.coords.accuracy ?? null,
              false,
            ).catch(() => {
              /* ignore */
            })
          },
        )

        if (cancelled) {
          void geo.clearWatch(watchId).catch(() => {
            /* ignore */
          })
          return
        }

        watchIdRef.current = watchId
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Native location error')
        }
      }
    })()

    return () => {
      cancelled = true
      const watchId = watchIdRef.current
      if (watchId != null) {
        void loadTauriGeo()
          .then((geo) => geo.clearWatch(watchId))
          .catch(() => {
            /* ignore */
          })
      }
    }
  }, [connected, enabled, ensureNativePermissions, native, reportToHa])

  // Keep encrypted prefs in sync when HA tokens refresh while sharing is on.
  useEffect(() => {
    if (!native || !enabled) return

    const sync = () => {
      if (!readHaAuth()?.access_token) return
      void updateNativeLocationCredentials().catch(() => {
        /* ignore — next start will rewrite */
      })
    }

    sync()
    window.addEventListener('storage', sync)
    const interval = window.setInterval(sync, 60_000)
    return () => {
      window.removeEventListener('storage', sync)
      window.clearInterval(interval)
    }
  }, [enabled, native])

  const hostName = native ? (getLocationDeviceName() ?? 'Android') : 'Casa Web'
  const webhookId = deviceId ? getLocationWebhookId(deviceId) : ''
  const entityId = deviceId ? locationTrackerEntityId(deviceId) : null
  const templateYaml = deviceId
    ? buildLocationTemplateYaml({
        deviceId,
        displayName: hostName,
        webhookId,
      })
    : ''

  return {
    enabled,
    setEnabled,
    permission,
    deviceId,
    webhookId,
    entityId,
    templateYaml,
    lastReport,
    lastCoords: lastReport ? formatCoords(lastReport.lat, lastReport.lon) : null,
    reporting,
    error,
    updateNow,
    supported: permission !== 'unsupported',
    native,
  }
}
