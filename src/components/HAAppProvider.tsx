import { HAProvider, useHAConnection } from 'hass-react'
import type { ReactNode } from 'react'
import { haUrl } from '#/config/ha'
import { DEMO_MODE, guardConnection } from '#/lib/demoMode'

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
      {DEMO_MODE ? <DemoGuard>{children}</DemoGuard> : children}
    </HAProvider>
  )
}

/**
 * Only mounted in demo mode. Guards the connection during render, which runs before any
 * child effect or tap can send a service call. `children` is a prop, so a re-render here
 * does not re-render the app.
 */
function DemoGuard({ children }: { children: ReactNode }) {
  const { connection } = useHAConnection()
  guardConnection(connection)

  return (
    <>
      {children}
      <div
        role="status"
        className="pointer-events-none fixed top-[max(env(safe-area-inset-top),0.5rem)] left-1/2 z-[100] -translate-x-1/2 rounded-pill bg-accent px-3 py-1 text-xs font-semibold text-on-accent shadow-card"
      >
        Demo mode · nothing is sent to the house
      </div>
    </>
  )
}
