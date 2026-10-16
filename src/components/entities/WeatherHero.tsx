import { useSensor, useWeather } from 'hass-react'
import { CloudRain, CloudSun, Sun, Cloud } from 'lucide-react'
import { entities } from '#/config/dashboard'
import { cn } from '#/lib/cn'

function weatherIcon(condition: string) {
  const c = condition.toLowerCase()
  if (c.includes('rain') || c.includes('pour')) return CloudRain
  if (c.includes('sun') || c.includes('clear')) return Sun
  if (c.includes('cloud') || c.includes('overcast')) return CloudSun
  return Cloud
}

export function WeatherHero() {
  const weather = useWeather(entities.weather)
  const outdoor = useSensor(entities.outdoorTemp)
  const Icon = weatherIcon(String(weather.condition ?? weather.state))
  const temp =
    outdoor.numericValue ??
    weather.temperature ??
    (outdoor.value != null ? Number(outdoor.value) : null)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border-subtle bg-surface p-4',
        weather.isUnavailable && 'opacity-50',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink-muted">Outside</p>
          <p className="mt-1 font-display text-4xl font-semibold tabular-nums tracking-tight text-ink">
            {temp != null && !Number.isNaN(temp) ? Math.round(temp) : '—'}
            <span className="text-xl text-ink-muted">°</span>
          </p>
          <p className="mt-1 capitalize text-sm text-ink-muted">
            {String(weather.condition ?? weather.state).replace(/-/g, ' ')}
            {weather.humidity != null ? ` · ${weather.humidity}% humidity` : ''}
          </p>
        </div>
        <Icon className="size-14 text-accent/80" strokeWidth={1.4} />
      </div>
    </div>
  )
}
