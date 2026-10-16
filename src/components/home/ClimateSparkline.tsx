import { Link } from '@tanstack/react-router'
import { useSensor } from 'hass-react'
import { ChevronRight, Thermometer } from 'lucide-react'
import { TempHistoryChart } from '#/components/charts/TempHistoryChart'
import { entities } from '#/config/dashboard'
import { useEntityHistory } from '#/hooks/useEntityHistory'
import { cn } from '#/lib/cn'

export function ClimateSparkline() {
  const temp = useSensor(entities.livingTemp)
  const { points, loading } = useEntityHistory(entities.livingTemp, 24)
  const current =
    temp.numericValue != null
      ? Math.round(temp.numericValue)
      : points.length
        ? Math.round(points[points.length - 1]!.state)
        : null

  return (
    <Link
      to="/climate"
      className={cn(
        'flex min-h-14 items-center gap-3 rounded-2xl border border-border-subtle bg-surface px-3.5 py-3 transition sm:px-4',
        'hover:border-accent/30 hover:bg-surface-hover',
      )}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
        <Thermometer className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">Climate</p>
        <p className="truncate text-xs text-ink-muted">
          Living room {current != null ? `${current}°F` : '—'} · Thermostat
        </p>
      </div>
      <div className="relative hidden h-9 w-24 shrink-0 overflow-hidden sm:block">
        {loading && points.length === 0 ? (
          <div className="absolute inset-0 animate-pulse rounded bg-border/20" />
        ) : (
          <TempHistoryChart
            points={points}
            variant="sparkline"
            height={36}
            ariaLabel="Living room temperature sparkline"
            className="pointer-events-none h-full"
          />
        )}
      </div>
      <ChevronRight className="size-5 shrink-0 text-ink-faint" />
    </Link>
  )
}
