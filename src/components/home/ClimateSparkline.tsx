import { Link } from '@tanstack/react-router'
import { useSensor } from 'hass-react'
import { Thermometer } from 'lucide-react'
import { entities } from '#/config/dashboard'
import { useEntityHistory } from '#/hooks/useEntityHistory'
import { cn } from '#/lib/cn'

function buildPath(points: Array<{ state: number }>, width: number, height: number) {
  if (points.length < 2) return ''
  const values = points.map((p) => p.state)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, 0.5)

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width
      const y = height - ((point.state - min) / span) * (height - 8) - 4
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export function ClimateSparkline() {
  const temp = useSensor(entities.livingTemp)
  const { points, loading } = useEntityHistory(entities.livingTemp, 24)
  const width = 320
  const height = 72
  const path = buildPath(points, width, height)
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
        'block overflow-hidden rounded-[1.75rem] border border-border-subtle bg-surface p-4 transition hover:border-accent/30',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">
            Living Room · 24h
          </p>
          <p className="mt-1 font-display text-4xl font-semibold tabular-nums tracking-tight text-ink">
            {current ?? '—'}
            <span className="text-xl text-ink-muted">°F</span>
          </p>
        </div>
        <span className="grid size-10 place-items-center rounded-2xl bg-success/15 text-success">
          <Thermometer className="size-5" />
        </span>
      </div>

      <div className="relative h-20 overflow-hidden rounded-2xl bg-canvas/50">
        {loading && points.length === 0 ? (
          <div className="absolute inset-0 animate-pulse bg-border/20" />
        ) : path ? (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-full w-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5ecf8e" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#5ecf8e" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path
              d={`${path} L${width},${height} L0,${height} Z`}
              fill="url(#tempFill)"
            />
            <path
              d={path}
              fill="none"
              stroke="#5ecf8e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : (
          <p className="grid h-full place-items-center text-xs text-ink-faint">
            No history yet
          </p>
        )}
      </div>
    </Link>
  )
}
