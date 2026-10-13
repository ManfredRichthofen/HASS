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
        'overflow-hidden rounded-[1.75rem] border border-border-subtle bg-surface p-4',
        weather.isUnavailable && 'opacity-50',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="capitalize text-sm font-medium text-ink">
            {String(weather.condition ?? weather.state).replace(/-/g, ' ')}
          </p>
          <p className="text-xs text-ink-muted">Forecast Home</p>
          <p className="mt-2 font-display text-4xl font-semibold tabular-nums tracking-tight text-ink">
            {temp != null && !Number.isNaN(temp) ? Math.round(temp) : '—'}
            <span className="text-xl text-ink-muted">°F</span>
          </p>
          {today ? (
            <p className="mt-1 text-xs text-ink-muted tabular-nums">
              {Math.round(today.temperature)}° / {Math.round(today.templow ?? today.temperature)}°
            </p>
          ) : null}
        </div>
        <Icon className="size-14 text-accent/85" strokeWidth={1.35} />
      </div>

      <div className="mt-4 grid grid-cols-5 gap-1.5 border-t border-border-subtle pt-3">
        {loading && forecast.length === 0
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-canvas" />
            ))
          : forecast.map((day) => {
              const DayIcon = weatherIcon(day.condition)
              return (
                <div
                  key={day.datetime}
                  className="flex flex-col items-center gap-1 rounded-xl px-1 py-1.5"
                >
                  <span className="text-[10px] font-medium text-ink-muted">
                    {weekday(day.datetime)}
                  </span>
                  <DayIcon className="size-4 text-ink-muted" />
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
