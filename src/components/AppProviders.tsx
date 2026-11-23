import { QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { HAAppProvider } from '#/components/HAAppProvider'
import { DEMO_MODE } from '#/lib/demoMode'
import { registerDemoQueryClient } from '#/lib/demoMusic'
import { createQueryClient } from '#/lib/queryClient'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client = createQueryClient()
    if (DEMO_MODE) registerDemoQueryClient(client)
    return client
  })

  return (
    <QueryClientProvider client={queryClient}>
      <HAAppProvider>{children}</HAAppProvider>
    </QueryClientProvider>
  )
}
