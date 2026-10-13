import { useEffect, useState } from 'react'
import { useServiceCall } from 'hass-react'
import { entities } from '#/config/dashboard'

export interface ForecastDay {
  condition: string
  datetime: string
  temperature: number
  templow?: number
  precipitation?: number
  humidity?: number
}

export function useWeatherForecast(days = 5) {
  const { callServiceWithResponse } = useServiceCall()
  const [forecast, setForecast] = useState<ForecastDay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const response = await callServiceWithResponse<
          | {
              response?: Record<string, { forecast?: ForecastDay[] }>
              service_response?: Record<string, { forecast?: ForecastDay[] }>
            }
          | Record<string, { forecast?: ForecastDay[] }>
        >('weather', 'get_forecasts', {
          entity_id: entities.weather,
          type: 'daily',
        })

        const map =
          (response as { response?: Record<string, { forecast?: ForecastDay[] }> })
            ?.response ??
          (response as { service_response?: Record<string, { forecast?: ForecastDay[] }> })
            ?.service_response ??
          (response as Record<string, { forecast?: ForecastDay[] }>)

        const daysList = map?.[entities.weather]?.forecast ?? []
        if (!cancelled) setForecast(daysList.slice(0, days))
      } catch {
        if (!cancelled) setForecast([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    const timer = window.setInterval(() => void load(), 15 * 60 * 1000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [callServiceWithResponse, days])

  return { forecast, loading }
}
