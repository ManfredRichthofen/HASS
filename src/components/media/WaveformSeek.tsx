import { Slider as BaseSlider } from '@base-ui/react/slider'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '#/lib/cn'

const BAR_COUNT = 64

/** Deterministic bar heights from a seed so each track looks different without audio peaks. */
const buildPeaks = (seed: string, count: number): number[] => {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const peaks: number[] = []
  for (let i = 0; i < count; i++) {
    hash ^= hash << 13
    hash ^= hash >>> 17
    hash ^= hash << 5
    const wave = 0.35 + 0.35 * Math.sin(i * 0.37 + (hash % 97) * 0.05)
    const noise = ((hash >>> 8) % 100) / 100
    peaks.push(Math.min(1, Math.max(0.18, wave * 0.55 + noise * 0.55)))
  }
  return peaks
}

type WaveformSeekProps = {
  value: number
  max: number
  disabled?: boolean
  seekable?: boolean
  /** Stable per-track seed so the wave shape doesn’t jump every second. */
  seed?: string
  'aria-label'?: string
  onValueChange?: (value: number) => void
  onValueCommitted?: (value: number) => void
  className?: string
}

/**
 * Spotify-like decorative waveform scrubber. Fill follows playback; drag seeks
 * when `seekable`. Heights are seeded visuals, not real audio analysis.
 */
export const WaveformSeek = ({
  value,
  max,
  disabled = false,
  seekable = true,
  seed = 'track',
  'aria-label': ariaLabel = 'Seek',
  onValueChange,
  onValueCommitted,
  className,
}: WaveformSeekProps) => {
  const peaks = useMemo(() => buildPeaks(seed, BAR_COUNT), [seed])
  const controlledMax = Math.max(1, Math.floor(max))
  const [local, setLocal] = useState(() => Math.min(value, controlledMax))
  const dragging = useRef(false)

  useEffect(() => {
    if (dragging.current) return
    setLocal(Math.min(value, controlledMax))
  }, [value, controlledMax])

  const pct = controlledMax > 0 ? Math.min(100, (local / controlledMax) * 100) : 0

  const bars = (
    <div
      className="pointer-events-none absolute inset-x-0 top-1/2 flex h-7 -translate-y-1/2 items-end gap-px"
      aria-hidden
    >
      {peaks.map((height, index) => {
        const barPct = ((index + 0.5) / peaks.length) * 100
        const filled = barPct <= pct
        return (
          <span
            key={index}
            className={cn(
              'min-w-0 flex-1 rounded-pill transition-colors duration-fast',
              filled ? 'bg-ink glass:bg-on-raised' : 'bg-ink/20 glass:bg-ink/15',
            )}
            style={{ height: `${Math.round(height * 100)}%` }}
          />
        )
      })}
      <span
        className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2 rounded-pill bg-ink glass:bg-on-raised"
        style={{ left: `${pct}%` }}
      />
    </div>
  )

  if (!seekable) {
    return (
      <div
        className={cn('relative w-full min-w-0 py-4', className)}
        role="progressbar"
        aria-label="Playback progress"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {bars}
      </div>
    )
  }

  return (
    <BaseSlider.Root
      className={cn('relative w-full min-w-0 touch-none select-none', className)}
      min={0}
      max={controlledMax}
      step={1}
      disabled={disabled}
      value={local}
      onValueChange={(next) => {
        dragging.current = true
        const resolved = Array.isArray(next) ? (next[0] ?? 0) : next
        setLocal(resolved)
        onValueChange?.(resolved)
      }}
      onValueCommitted={(next) => {
        const resolved = Array.isArray(next) ? (next[0] ?? 0) : next
        setLocal(resolved)
        dragging.current = false
        onValueCommitted?.(resolved)
      }}
    >
      <BaseSlider.Control className="relative flex w-full min-w-0 cursor-pointer touch-none py-4">
        {bars}
        <BaseSlider.Track className="relative h-7 w-full min-w-0 grow bg-transparent">
          <BaseSlider.Indicator className="absolute h-full bg-transparent" />
          <BaseSlider.Thumb
            aria-label={ariaLabel}
            className={cn(
              'size-4 rounded-pill bg-transparent outline-none',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            )}
          />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  )
}
