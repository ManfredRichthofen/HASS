import { useQuery } from '@tanstack/react-query'
import { useHAConnection } from 'hass-react'
import type { FrigateEvent } from '#/lib/frigate'

type Options = {
  camera: string
  instanceId?: string
  limit?: number
  /** Only fetch while the doorbell popup (or other UI) is open. */
  enabled?: boolean
  /** Look back this many hours for the initial list. */
  hours?: number
  refetchIntervalMs?: number
}

/**
 * Recent Frigate events for a camera via the HA Frigate WS API
 * (`frigate/events/get`).
 */
export function useFrigateEvents({
  camera,
  instanceId = 'frigate',
  limit = 12,
  enabled = true,
  hours = 12,
  refetchIntervalMs = 8_000,
}: Options) {
  const { connection, connected } = useHAConnection()
  const canQuery = Boolean(connection && connected && camera && enabled)

  const query = useQuery({
    queryKey: ['frigate-events', instanceId, camera, limit, hours],
    enabled: canQuery,
    staleTime: 4_000,
    refetchInterval: enabled ? refetchIntervalMs : false,
    queryFn: async () => {
      if (!connection) return [] as FrigateEvent[]

      const after = Math.floor(Date.now() / 1000 - hours * 3600)

      try {
        const result = await connection.sendMessagePromise<FrigateEvent[]>({
          type: 'frigate/events/get',
          instance_id: instanceId,
          cameras: [camera],
          after,
          limit,
          has_snapshot: true,
        })
        return Array.isArray(result) ? result : []
      } catch {
        // Retry without has_snapshot — older Frigate / empty results edge cases.
        const result = await connection.sendMessagePromise<FrigateEvent[]>({
          type: 'frigate/events/get',
          instance_id: instanceId,
          cameras: [camera],
          after,
          limit,
        })
        return Array.isArray(result) ? result : []
      }
    },
  })

  return {
    events: query.data ?? [],
    loading: query.isLoading || query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: () => query.refetch(),
  }
}
