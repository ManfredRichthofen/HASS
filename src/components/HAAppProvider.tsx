import { HAProvider } from 'hass-react'
import type { ReactNode } from 'react'
import { haUrl } from '#/config/ha'

export function HAAppProvider({ children }: { children: ReactNode }) {
  if (!haUrl) {
    return <>{children}</>
  }

  return (
    <HAProvider
      url={haUrl}
      authMode="oauth"
      options={{
        autoReconnect: true,
        reconnectInterval: 5000,
        reconnectAttempts: 10,
        tokenRefreshIntervalMinutes: 30,
        tokenRefreshBufferMinutes: 5,
      }}
    >
      {children}
    </HAProvider>
  )
}
