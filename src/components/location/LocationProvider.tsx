import { createContext, useContext, type ReactNode } from 'react'
import {
  useDeviceLocation,
  type LocationPermission,
} from '#/hooks/useDeviceLocation'
import type { LocationReportSnapshot } from '#/lib/deviceLocation'

type LocationContextValue = {
  enabled: boolean
  setEnabled: (
    enabled: boolean,
  ) => Promise<{ ok: true } | { ok: false; message: string }>
  permission: LocationPermission
  deviceId: string
  entityId: string | null
  lastReport: LocationReportSnapshot | null
  lastCoords: string | null
  reporting: boolean
  error: string | null
  updateNow: () => Promise<void>
  supported: boolean
  native: boolean
}

const LocationContext = createContext<LocationContextValue | null>(null)

/** Keeps geolocation watch / FGS alive for the whole authenticated session. */
export function LocationProvider({ children }: { children: ReactNode }) {
  const location = useDeviceLocation()
  return (
    <LocationContext.Provider value={location}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocationSharing(): LocationContextValue {
  const ctx = useContext(LocationContext)
  if (!ctx) {
    throw new Error('useLocationSharing must be used within LocationProvider')
  }
  return ctx
}
