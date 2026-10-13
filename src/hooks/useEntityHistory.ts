import { useEffect, useState } from 'react'
import { useHAConnection } from 'hass-react'

export interface HistoryPoint {
  state: number
  last_changed: string
}

export function useEntityHistory(entityId: string, hours = 24) {
  const { connection, connected } = useHAConnection()
  const [points, setPoints] = useState<HistoryPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!connection || !connected) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const end = new Date()
        const start = new Date(end.getTime() - hours * 60 * 60 * 1000)
        const result = await connection!.sendMessagePromise<
          | Record<string, Array<{ state: string; last_changed: string }>>
          | Array<Array<{ state: string; last_changed: string }>>
        >({
          type: 'history/history_during_period',
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          entity_ids: [entityId],
          minimal_response: true,
          significant_changes_only: false,
          no_attributes: true,
        })

        const series = Array.isArray(result)
          ? (result[0] ?? [])
          : (result?.[entityId] ?? [])

        const parsed = downsample(
          series
            .map((row) => ({
              state: Number(row.state),
              last_changed: row.last_changed,
            }))
            .filter((row) => Number.isFinite(row.state)),
          96,
        )

        if (!cancelled) setPoints(parsed)
      } catch {
        // Fallback shape used by older history/period
        try {
          const end = new Date()
          const start = new Date(end.getTime() - hours * 60 * 60 * 1000)
          const result = await connection!.sendMessagePromise<
            Array<Array<{ state: string; last_changed: string }>>
          >({
            type: 'history/period/' + start.toISOString(),
            end_time: end.toISOString(),
            filter_entity_id: entityId,
            minimal_response: true,
            significant_changes_only: false,
          })
          const series = result?.[0] ?? []
          const parsed = downsample(
            series
              .map((row) => ({
                state: Number(row.state),
                last_changed: row.last_changed,
              }))
              .filter((row) => Number.isFinite(row.state)),
            96,
          )
          if (!cancelled) setPoints(parsed)
        } catch {
          if (!cancelled) setPoints([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    const timer = window.setInterval(() => void load(), 5 * 60 * 1000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [connection, connected, entityId, hours])

  return { points, loading }
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
