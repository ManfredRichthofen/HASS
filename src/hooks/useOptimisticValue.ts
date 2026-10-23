import { useEffect, useState } from 'react'

/**
 * Local override that paints immediately, then clears once `server` catches up.
 * On action failure, rolls back to the previous displayed value.
 */
export const useOptimisticValue = <T,>(server: T) => {
  const [override, setOverride] = useState<T | null>(null)

  useEffect(() => {
    if (override !== null && Object.is(override, server)) setOverride(null)
  }, [override, server])

  return {
    value: (override ?? server) as T,
    commit: (next: T, action: () => Promise<unknown>) => {
      const prev = override ?? server
      setOverride(next)
      void action().catch(() => setOverride(prev))
    },
    setOverride,
  }
}
