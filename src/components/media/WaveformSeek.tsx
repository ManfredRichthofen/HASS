import { Slider as BaseSlider } from '@base-ui/react/slider'
import { useCallback, useEffect, useRef } from 'react'
import { asNumber } from '#/components/ui/slider'
import { useMediaQuery } from '#/hooks/useMediaQuery'
import { cn } from '#/lib/cn'

/** Wavelength of one full sine cycle, in CSS px. */
const WAVE_LENGTH = 22
/** Peak vertical excursion while playing, in CSS px. */
const WAVE_AMPLITUDE = 3.5
/** How fast the wave travels, in wavelength-fractions per second. */
const PHASE_SPEED = 1.15
/** Seconds for amplitude to ease in/out on play/pause. */
const AMPLITUDE_EASE = 0.28
/** Sample spacing along the path, in CSS px. */
const SAMPLE_STEP = 2
const SVG_HEIGHT = Math.ceil(WAVE_AMPLITUDE * 2 + 8)
/** Distance over which the wave tapers to flat at the thumb, in CSS px. */
const TAPER = WAVE_LENGTH * 0.55

type WaveformSeekProps = {
  /** Controlled position; the caller owns any in-progress drag value. */
  value: number
  max: number
  disabled?: boolean
  seekable?: boolean
  /** When true the squiggle travels; otherwise it settles to a flat line. */
  playing?: boolean
  'aria-label'?: string
  onValueChange?: (value: number) => void
  onValueCommitted?: (value: number) => void
  className?: string
}

/**
 * Build the played squiggle and remaining straight segment, matching Android’s
 * SquigglyProgress: sine while playing, tapered to flat at the thumb.
 */
const buildPaths = (
  width: number,
  progressPx: number,
  phase: number,
  amplitude: number,
): { played: string; rest: string } => {
  const midY = SVG_HEIGHT / 2
  const clampProgress = Math.max(0, Math.min(width, progressPx))

  let played = `M 0 ${midY.toFixed(2)}`
  if (clampProgress > 0) {
    for (let x = 0; x <= clampProgress; x += SAMPLE_STEP) {
      const taperFactor = Math.min(1, Math.max(0, (clampProgress - x) / TAPER))
      const y = midY + amplitude * taperFactor * Math.sin((x / WAVE_LENGTH) * Math.PI * 2 + phase)
      played += ` L ${x.toFixed(2)} ${y.toFixed(2)}`
    }
    if (clampProgress % SAMPLE_STEP !== 0) {
      played += ` L ${clampProgress.toFixed(2)} ${midY.toFixed(2)}`
    }
  }

  const rest =
    clampProgress < width
      ? `M ${clampProgress.toFixed(2)} ${midY.toFixed(2)} L ${width.toFixed(2)} ${midY.toFixed(2)}`
      : ''

  return { played, rest }
}

type SquiggleVisualProps = {
  playing: boolean
  value: number
  max: number
}

/**
 * Imperatively animated squiggle so playback doesn’t re-render React at 60fps.
 * The frame loop only runs while the wave is travelling or easing in/out; when
 * idle it repaints once per value or size change.
 */
const SquiggleVisual = ({ playing, value, max }: SquiggleVisualProps) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const playedRef = useRef<SVGPathElement>(null)
  const restRef = useRef<SVGPathElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const anim = useRef({ phase: 0, amplitude: 0, width: 0, frame: 0 })
  const live = useRef({ playing, value, max, reduceMotion })
  live.current = { playing, value, max, reduceMotion }

  const paint = useCallback(() => {
    const { width, phase, amplitude } = anim.current
    if (width <= 0) return
    const { value: v, max: m } = live.current
    const { played, rest } = buildPaths(width, (v / m) * width, phase, amplitude)
    playedRef.current?.setAttribute('d', played)
    if (restRef.current) {
      restRef.current.setAttribute('d', rest)
      restRef.current.style.display = rest ? '' : 'none'
    }
  }, [])

  const startLoop = useCallback(() => {
    const a = anim.current
    if (a.frame) return
    let lastTs = performance.now()
    const tick = (ts: number) => {
      const dt = Math.min(0.05, (ts - lastTs) / 1000)
      lastTs = ts
      const { playing: isPlaying, reduceMotion: still } = live.current

      // Paused → flat. Playing + reduced motion → static squiggle. Else travel.
      const targetAmp = isPlaying ? WAVE_AMPLITUDE : 0
      const ampDelta = targetAmp - a.amplitude
      const step = (WAVE_AMPLITUDE / AMPLITUDE_EASE) * dt
      a.amplitude =
        Math.abs(ampDelta) < 0.01 ? targetAmp : a.amplitude + Math.sign(ampDelta) * Math.min(Math.abs(ampDelta), step)

      const travelling = isPlaying && !still
      if (travelling) a.phase += dt * PHASE_SPEED * Math.PI * 2

      paint()
      a.frame = travelling || a.amplitude !== targetAmp ? requestAnimationFrame(tick) : 0
    }
    a.frame = requestAnimationFrame(tick)
  }, [paint])

  useEffect(() => {
    const node = trackRef.current
    if (!node) return
    const syncWidth = () => {
      anim.current.width = node.clientWidth
      svgRef.current?.setAttribute('width', String(Math.max(1, anim.current.width)))
      paint()
    }
    syncWidth()
    const observer = new ResizeObserver(syncWidth)
    observer.observe(node)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(anim.current.frame)
      anim.current.frame = 0
    }
  }, [paint])

  // Play/pause or motion preference change → run the loop until it settles.
  // biome-ignore lint/correctness/useExhaustiveDependencies: playing/reduceMotion are read via live ref; they are the restart triggers
  useEffect(() => startLoop(), [startLoop, playing, reduceMotion])

  // Position or length changed while idle → one repaint.
  // biome-ignore lint/correctness/useExhaustiveDependencies: value/max are read via live ref; they are the repaint triggers
  useEffect(() => {
    if (!anim.current.frame) paint()
  }, [paint, value, max])

  return (
    <div
      ref={trackRef}
      className="pointer-events-none absolute inset-x-0 top-1/2 h-7 -translate-y-1/2"
      aria-hidden
    >
      <svg
        ref={svgRef}
        className="absolute left-0 top-1/2 -translate-y-1/2 overflow-visible text-ink"
        width="1"
        height={SVG_HEIGHT}
      >
        <path
          ref={restRef}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          className="opacity-25 glass:opacity-20"
        />
        <path
          ref={playedRef}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="glass:text-on-raised"
        />
      </svg>
      <span
        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-ink shadow-sm glass:bg-on-raised"
        style={{ left: `${(value / max) * 100}%` }}
      />
    </div>
  )
}

/**
 * Spotify / Android-style squiggly seek bar. Played portion undulates; remaining
 * stays a straight hairline. Settles flat when paused or when motion is reduced.
 */
export const WaveformSeek = ({
  value,
  max,
  disabled = false,
  seekable = true,
  playing = false,
  'aria-label': ariaLabel = 'Seek',
  onValueChange,
  onValueCommitted,
  className,
}: WaveformSeekProps) => {
  const safeMax = Math.max(1, Math.floor(max))
  const clamped = Math.min(value, safeMax)
  const visual = <SquiggleVisual playing={playing} value={clamped} max={safeMax} />

  if (!seekable) {
    return (
      <div
        className={cn('relative w-full min-w-0 py-4', className)}
        role="progressbar"
        aria-label="Playback progress"
        aria-valuenow={Math.round((clamped / safeMax) * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {visual}
      </div>
    )
  }

  return (
    <BaseSlider.Root
      className={cn('relative w-full min-w-0 touch-none select-none', className)}
      min={0}
      max={safeMax}
      step={1}
      disabled={disabled}
      value={clamped}
      onValueChange={(next) => onValueChange?.(asNumber(next))}
      onValueCommitted={(next) => onValueCommitted?.(asNumber(next))}
    >
      <BaseSlider.Control className="relative flex w-full min-w-0 cursor-pointer touch-none py-4">
        {visual}
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
