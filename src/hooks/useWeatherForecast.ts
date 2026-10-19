import { useQuery } from '@tanstack/react-query'
import { useHAConnection, useServiceCall } from 'hass-react'
import { entities } from '#/config/dashboard'

export interface ForecastDay {
  condition: string
  datetime: string
  temperature: number
  templow?: number
  precipitation?: number
  humidity?: number
}

type ForecastResponse =
  | {
      response?: Record<string, { forecast?: ForecastDay[] }>
      service_response?: Record<string, { forecast?: ForecastDay[] }>
    }
  | Record<string, { forecast?: ForecastDay[] }>

function parseForecast(response: ForecastResponse, days: number): ForecastDay[] {
  const map =
    (response as { response?: Record<string, { forecast?: ForecastDay[] }> })?.response ??
    (response as { service_response?: Record<string, { forecast?: ForecastDay[] }> })
      ?.service_response ??
    (response as Record<string, { forecast?: ForecastDay[] }>)

  return (map?.[entities.weather]?.forecast ?? []).slice(0, days)
}

export function useWeatherForecast(days = 5) {
  const { connected } = useHAConnection()
  const { callServiceWithResponse } = useServiceCall()

  const query = useQuery({
    queryKey: ['weather-forecast', entities.weather, days],
    enabled: connected,
    staleTime: 10 * 60_000,
    refetchInterval: 15 * 60_000,
    queryFn: async () => {
      const response = await callServiceWithResponse<ForecastResponse>('weather', 'get_forecasts', {
        entity_id: entities.weather,
        type: 'daily',
      })
      return parseForecast(response, days)
    },
  })

  return {
    forecast: query.data ?? [],
    loading: query.isLoading,
  }
}
