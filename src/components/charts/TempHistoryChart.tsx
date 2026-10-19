import { areaY, defineChart, lineY } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/react'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { tooltip } from '@tanstack/charts/tooltip'
import { useMemo } from 'react'
import type { HistoryPoint } from '#/hooks/useEntityHistory'
import { cn } from '#/lib/cn'

const STROKE = '#5ecf8e'
const FILL = '#5ecf8e'

type ChartRow = {
  t: number
  temp: number
  label: string
}

function toRows(points: HistoryPoint[]): ChartRow[] {
  return points.map((point) => {
    const date = new Date(point.last_changed)
    return {
      t: date.getTime(),
      temp: point.state,
      label: date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    }
  })
}

function formatHour(value: number) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
  })
}

function formatTemp(value: number) {
  return `${Math.round(value)}°`
}

type TempHistoryChartProps = {
  points: HistoryPoint[]
  variant?: 'sparkline' | 'full'
  className?: string
  height?: number
  ariaLabel?: string
}

export function TempHistoryChart({
  points,
  variant = 'full',
  className,
  height,
  ariaLabel = 'Temperature history',
}: TempHistoryChartProps) {
  const rows = useMemo(() => toRows(points), [points])
  const isSpark = variant === 'sparkline'
  const chartHeight = height ?? (isSpark ? 36 : 220)

  const definition = useMemo(() => {
    if (rows.length < 2) return null

    const temps = rows.map((row) => row.temp)
    const baseline = Math.min(...temps)

    if (isSpark) {
      return defineChart({
        guides: false,
        margin: { top: 2, right: 2, bottom: 2, left: 2 },
        marks: [
          lineY(rows, {
            x: 't',
            y: 'temp',
            stroke: STROKE,
            strokeWidth: 2,
          }),
        ],
        scales: {
          x: { scale: scaleLinear, axis: false },
          y: { scale: scaleLinear, axis: false },
        },
      })
    }

    return defineChart({
      marks: [
        areaY(rows, {
          x: 't',
          y: 'temp',
          y1: baseline,
          fill: FILL,
          fillOpacity: 0.18,
        }),
        lineY(rows, {
          x: 't',
          y: 'temp',
          stroke: STROKE,
          strokeWidth: 2,
        }),
      ],
      scales: {
        x: {
          scale: scaleLinear,
          axis: {
            ticks: {
              count: 5,
              format: (value) => formatHour(Number(value)),
            },
          },
        },
        y: {
          scale: scaleLinear,
          nice: true,
          grid: true,
          axis: {
            ticks: {
              count: 4,
              format: (value) => formatTemp(Number(value)),
            },
          },
        },
      },
      tooltip,
    })
  }, [isSpark, rows])

  if (!definition) return null

  return (
    <Chart
      definition={definition}
      height={chartHeight}
      ariaLabel={ariaLabel}
      className={cn('w-full min-w-0', className)}
    />
  )
}
