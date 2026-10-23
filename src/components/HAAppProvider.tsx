import { HAProvider } from 'hass-react'
import type { ReactNode } from 'react'
import { haUrl } from '#/config/ha'

/**
 * Module-level so HAProvider does not rebuild context identity every render.
 * Note: hass-react 1.0 honors `autoReconnect` + token refresh options only;
 * `reconnectAttempts` / `reconnectInterval` are typed but unused by the library.
 */
const HA_PROVIDER_OPTIONS = {
  autoReconnect: true,
  tokenRefreshIntervalMinutes: 30,
  tokenRefreshBufferMinutes: 5,
} as const

export function HAAppProvider({ children }: { children: ReactNode }) {
  if (!haUrl) {
    return <>{children}</>
  }

  return (
    <HAProvider url={haUrl} authMode="oauth" options={HA_PROVIDER_OPTIONS}>
      {children}
    </HAProvider>
  )
}
