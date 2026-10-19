import { useQuery } from '@tanstack/react-query'
import { useHAConnection } from 'hass-react'

export interface HistoryPoint {
  state: number
  last_changed: string
}

function downsample(points: HistoryPoint[], maxPoints: number): HistoryPoint[] {
  if (points.length <= maxPoints) return points
  const step = (points.length - 1) / (maxPoints - 1)
  const sampled: HistoryPoint[] = []
  for (let i = 0; i < maxPoints; i++) {
    sampled.push(points[Math.round(i * step)]!)
  }
  return sampled
}

function toPoints(series: Array<{ state: string; last_changed: string }>): HistoryPoint[] {
  return downsample(
    series
      .map((row) => ({
        state: Number(row.state),
        last_changed: row.last_changed,
      }))
      .filter((row) => Number.isFinite(row.state)),
    48,
  )
}

export function useEntityHistory(entityId: string, hours = 24, options?: { enabled?: boolean }) {
  const { connection, connected } = useHAConnection()
  const enabled = Boolean(connection && connected) && (options?.enabled ?? true)

  const query = useQuery({
    queryKey: ['entity-history', entityId, hours],
    enabled,
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      if (!connection) return [] as HistoryPoint[]

      const end = new Date()
      const start = new Date(end.getTime() - hours * 60 * 60 * 1000)

      try {
        const result = await connection.sendMessagePromise<
          | Record<string, Array<{ state: string; last_changed: string }>>
          | Array<Array<{ state: string; last_changed: string }>>
        >({
          type: 'history/history_during_period',
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          entity_ids: [entityId],
          minimal_response: true,
          significant_changes_only: true,
          no_attributes: true,
        })

        const series = Array.isArray(result) ? (result[0] ?? []) : (result?.[entityId] ?? [])

        return toPoints(series)
      } catch {
        const result = await connection.sendMessagePromise<
          Array<Array<{ state: string; last_changed: string }>>
        >({
          type: 'history/period/' + start.toISOString(),
          end_time: end.toISOString(),
          filter_entity_id: entityId,
          minimal_response: true,
          significant_changes_only: true,
        })

        return toPoints(result?.[0] ?? [])
      }
    },
  })

  return {
    points: query.data ?? [],
    loading: query.isLoading,
  }
}
