import { useQuery } from '@tanstack/react-query'
import { useMediaPlayer, useServiceCall } from 'hass-react'
import { useCallback } from 'react'
import { type MusicQueue, parseQueueResponse } from '#/lib/musicAssistant'

export function useMusicQueue(entityId: string) {
  const { callServiceWithResponse } = useServiceCall()
  const player = useMediaPlayer(entityId)
  const active = player.isPlaying || player.isPaused

  const query = useQuery({
    queryKey: ['music-queue', entityId],
    enabled: Boolean(entityId),
    staleTime: 8_000,
    refetchInterval: active ? 8_000 : 20_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<MusicQueue | null> => {
      try {
        const response = await callServiceWithResponse('music_assistant', 'get_queue', {
          entity_id: entityId,
        })
        return parseQueueResponse(response, entityId)
      } catch {
        // No active MA queue (idle player / non-MA source) — treat as empty.
        return null
      }
    },
  })

  const refresh = useCallback(async () => {
    await query.refetch()
  }, [query])

  return {
    queue: query.data ?? null,
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.error,
    refresh,
    player,
  }
}
