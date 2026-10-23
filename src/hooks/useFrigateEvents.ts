import { useQuery } from '@tanstack/react-query'
import { useHAConnection } from 'hass-react'
import type { FrigateEvent } from '#/lib/frigate'
import { normalizeFrigateEvent } from '#/lib/frigate'

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

type FetchResult = {
  events: FrigateEvent[]
  instanceId: string
}

/**
 * Frigate HA WS endpoints proxy raw HTTP bodies with `decode_json=False`,
 * so the result often arrives as a JSON *string* that must be unwrapped.
 * See advanced-camera-card `homeAssistantWSRequest(..., passthrough=true)`.
 */
function parseEventsPayload(raw: unknown): FrigateEvent[] {
  let data: unknown = raw
  if (typeof data === 'string') {
    const trimmed = data.trim()
    if (!trimmed) return []
    try {
      data = JSON.parse(trimmed)
    } catch {
      return []
    }
  }
  if (!Array.isArray(data)) return []
  return data.map((item) => normalizeFrigateEvent(item)).filter((e): e is FrigateEvent => e != null)
}

async function fetchEvents(
  connection: {
    sendMessagePromise: <T>(msg: { type: string; [key: string]: unknown }) => Promise<T>
  },
  instanceId: string,
  cameras: string[] | undefined,
  after: number,
  limit: number,
) {
  const raw = await connection.sendMessagePromise<unknown>({
    type: 'frigate/events/get',
    instance_id: instanceId,
    ...(cameras?.length ? { cameras } : {}),
    after,
    limit,
  })
  return parseEventsPayload(raw)
}

function cameraMatches(eventCamera: string | undefined, wanted: string) {
  if (!eventCamera || !wanted) return false
  const a = eventCamera.toLowerCase().replace(/-/g, '_')
  const b = wanted.toLowerCase().replace(/-/g, '_')
  return a === b || a.includes(b) || b.includes(a)
}

function cameraNameCandidates(camera: string) {
  const base = camera.trim()
  if (!base) return [] as string[]
  const variants = new Set<string>([base, base.replace(/-/g, '_'), base.replace(/_/g, '-')])
  return Array.from(variants)
}

/**
 * Recent Frigate events via the HA Frigate WS API (`frigate/events/get`).
 * Tries the configured instance, then common fallbacks, and finally all cameras.
 */
export function useFrigateEvents({
  camera,
  instanceId = 'frigate',
  limit = 12,
  enabled = true,
  hours = 24,
  refetchIntervalMs = 8_000,
}: Options) {
  const { connection, connected } = useHAConnection()
  const canQuery = Boolean(connection && connected && enabled)

  const query = useQuery({
    queryKey: ['frigate-events', instanceId, camera, limit, hours],
    enabled: canQuery,
    staleTime: 4_000,
    refetchInterval: enabled ? refetchIntervalMs : false,
    retry: 1,
    queryFn: async (): Promise<FetchResult> => {
      if (!connection) return { events: [], instanceId }

      const after = Math.floor(Date.now() / 1000 - hours * 3600)
      const instances = Array.from(
        new Set([instanceId, 'frigate', 'frigate-fa', 'ccab4aaf-frigate'].filter(Boolean)),
      )
      const names = cameraNameCandidates(camera)

      let lastError: Error | null = null
      let emptyOk: FetchResult | null = null

      for (const id of instances) {
        try {
          for (const name of names.length ? names : [undefined]) {
            const scoped = await fetchEvents(
              connection,
              id,
              name ? [name] : undefined,
              after,
              limit,
            )
            if (scoped.length > 0) return { events: scoped, instanceId: id }
          }

          // Camera name may not match — pull recent events and filter client-side.
          const all = await fetchEvents(connection, id, undefined, after, Math.max(limit, 25))
          emptyOk = { events: [], instanceId: id }
          if (!camera) return { events: all, instanceId: id }
          const matched = all.filter((e) => cameraMatches(e.camera, camera))
          if (matched.length > 0) return { events: matched, instanceId: id }
          if (all.length > 0) return { events: all, instanceId: id }
        } catch (e) {
          lastError = e instanceof Error ? e : new Error(String(e))
        }
      }

      if (emptyOk) return emptyOk
      throw lastError ?? new Error('Frigate events unavailable')
    },
  })

  return {
    events: query.data?.events ?? [],
    resolvedInstanceId: query.data?.instanceId ?? instanceId,
    loading: query.isLoading || query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: () => query.refetch(),
  }
}
