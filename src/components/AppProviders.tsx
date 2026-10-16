import { useState, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { HAAppProvider } from '#/components/HAAppProvider'
import { createQueryClient } from '#/lib/queryClient'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <HAAppProvider>{children}</HAAppProvider>
    </QueryClientProvider>
  )
}
