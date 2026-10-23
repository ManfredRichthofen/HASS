import { useSensor, useWeather } from 'hass-react'
import { Cloud, CloudRain, CloudSun, Moon, Sun } from 'lucide-react'
import { entities } from '#/config/dashboard'
import { useWeatherForecast } from '#/hooks/useWeatherForecast'
import { cn } from '#/lib/cn'

function weatherIcon(condition: string) {
  const c = condition.toLowerCase()
  if (c.includes('rain') || c.includes('pour') || c.includes('snow')) return CloudRain
  if (c.includes('clear-night') || c.includes('night')) return Moon
  if (c.includes('sun') || c.includes('clear')) return Sun
  if (c.includes('partly') || c.includes('cloud')) return CloudSun
  return Cloud
}

function weekday(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short' })
}

export function WeatherCard() {
  const weather = useWeather(entities.weather)
  const outdoor = useSensor(entities.outdoorTemp)
  const { forecast, loading } = useWeatherForecast(5)
  const Icon = weatherIcon(String(weather.condition ?? weather.state))
  const temp =
    outdoor.numericValue ??
    weather.temperature ??
    (outdoor.value != null ? Number(outdoor.value) : null)
  const today = forecast[0]

  return (
    <div
      className={cn(
        'flex h-full min-w-0 flex-col overflow-hidden rounded-card border-ui border-border-subtle bg-surface shadow-card modern:border-transparent p-3.5 sm:p-4',
        weather.isUnavailable && 'opacity-50',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium capitalize text-ink">
            {String(weather.condition ?? weather.state).replace(/-/g, ' ')}
          </p>
          <p className="mt-1.5 text-display text-3xl tabular-nums text-ink sm:mt-2 sm:text-4xl">
            {temp != null && !Number.isNaN(temp) ? Math.round(temp) : '—'}
            <span className="text-lg text-ink-muted sm:text-xl">°F</span>
          </p>
          {today ? (
            <p className="mt-1 text-xs text-ink-muted tabular-nums">
              H {Math.round(today.temperature)}° · L{' '}
              {Math.round(today.templow ?? today.temperature)}°
            </p>
          ) : null}
        </div>
        <Icon className="size-11 shrink-0 text-light sm:size-14" strokeWidth={1.35} aria-hidden />
      </div>

      <div className="mt-auto grid grid-cols-5 gap-1 border-t border-border-subtle pt-3 sm:mt-4 sm:gap-1.5">
        {loading && forecast.length === 0
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-control bg-canvas sm:h-16" />
            ))
          : forecast.map((day) => {
              const DayIcon = weatherIcon(day.condition)
              return (
                <div
                  key={day.datetime}
                  className="flex flex-col items-center gap-0.5 rounded-control px-0.5 py-1 sm:gap-1 sm:px-1 sm:py-1.5"
                >
                  <span className="text-[10px] font-medium text-ink-muted">
                    {weekday(day.datetime)}
                  </span>
                  <DayIcon className="size-3.5 text-ink-muted sm:size-4" />
                  <span className="text-[11px] font-semibold tabular-nums text-ink">
                    {Math.round(day.temperature)}°
                  </span>
                  <span className="text-[10px] tabular-nums text-ink-faint">
                    {Math.round(day.templow ?? day.temperature)}°
                  </span>
                </div>
              )
            })}
      </div>
    </div>
  )
}
