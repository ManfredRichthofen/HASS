import { Slider as BaseSlider } from '@base-ui/react/slider'
import { useEffect, useRef, useState } from 'react'
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

type WaveformSeekProps = {
  value: number
  max: number
  disabled?: boolean
  seekable?: boolean
  /** When true the squiggle travels; otherwise it settles to a flat line. */
  playing?: boolean
  /** Kept for callers that seed per-track visuals; unused by the sine path. */
  seed?: string
  'aria-label'?: string
  onValueChange?: (value: number) => void
  onValueCommitted?: (value: number) => void
  className?: string
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
  const taper = WAVE_LENGTH * 0.55

  let played = `M 0 ${midY.toFixed(2)}`
  if (clampProgress > 0) {
    for (let x = 0; x <= clampProgress; x += SAMPLE_STEP) {
      const distFromEnd = clampProgress - x
      const taperFactor =
        amplitude <= 0 || taper <= 0 ? 0 : Math.min(1, Math.max(0, distFromEnd / taper))
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
  pct: number
  playing: boolean
  local: number
  controlledMax: number
}

/**
 * Imperatively animated squiggle so playback doesn’t re-render React at 60fps.
 */
const SquiggleVisual = ({ pct, playing, local, controlledMax }: SquiggleVisualProps) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const playedRef = useRef<SVGPathElement>(null)
  const restRef = useRef<SVGPathElement>(null)
  const thumbRef = useRef<HTMLSpanElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const phaseRef = useRef(0)
  const amplitudeRef = useRef(0)
  const playingRef = useRef(playing)
  const localRef = useRef(local)
  const maxRef = useRef(controlledMax)
  const reduceMotionRef = useRef(false)
  const widthRef = useRef(0)

  playingRef.current = playing
  localRef.current = local
  maxRef.current = controlledMax

  useEffect(() => {
    const node = trackRef.current
    if (!node) return

    const syncWidth = () => {
      widthRef.current = node.clientWidth
      const svg = svgRef.current
      if (svg) svg.setAttribute('width', String(Math.max(1, widthRef.current)))
    }
    syncWidth()
    const observer = new ResizeObserver(syncWidth)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    reduceMotionRef.current = prefersReducedMotion()
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => {
      reduceMotionRef.current = media.matches
    }
    media.addEventListener('change', handleChange)

    let frame = 0
    let lastTs = performance.now()

    const paint = (phase: number, amplitude: number) => {
      const w = widthRef.current
      if (w <= 0) return
      const progressPx = maxRef.current > 0 ? (localRef.current / maxRef.current) * w : 0
      const { played, rest } = buildPaths(w, progressPx, phase, amplitude)
      playedRef.current?.setAttribute('d', played)
      if (restRef.current) {
        if (rest) {
          restRef.current.setAttribute('d', rest)
          restRef.current.style.display = ''
        } else {
          restRef.current.style.display = 'none'
        }
      }
      if (thumbRef.current) {
        thumbRef.current.style.left = `${maxRef.current > 0 ? (localRef.current / maxRef.current) * 100 : 0}%`
      }
    }

    const tick = (ts: number) => {
      const dt = Math.min(0.05, (ts - lastTs) / 1000)
      lastTs = ts

      // Paused → flat. Playing + reduced motion → static squiggle. Else travel.
      const targetAmp = playingRef.current ? WAVE_AMPLITUDE : 0
      const ampDelta = targetAmp - amplitudeRef.current
      if (Math.abs(ampDelta) < 0.01) {
        amplitudeRef.current = targetAmp
      } else {
        const step = (WAVE_AMPLITUDE / AMPLITUDE_EASE) * dt
        amplitudeRef.current += Math.sign(ampDelta) * Math.min(Math.abs(ampDelta), step)
      }

      if (playingRef.current && !reduceMotionRef.current) {
        phaseRef.current += dt * PHASE_SPEED * Math.PI * 2
      }

      paint(phaseRef.current, amplitudeRef.current)
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      media.removeEventListener('change', handleChange)
    }
  }, [])

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
        ref={thumbRef}
        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-ink shadow-sm glass:bg-on-raised"
        style={{ left: `${pct}%` }}
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
  const controlledMax = Math.max(1, Math.floor(max))
  const [local, setLocal] = useState(() => Math.min(value, controlledMax))
  const dragging = useRef(false)

  useEffect(() => {
    if (dragging.current) return
    setLocal(Math.min(value, controlledMax))
  }, [value, controlledMax])

  const pct = controlledMax > 0 ? Math.min(100, (local / controlledMax) * 100) : 0
  const visual = (
    <SquiggleVisual pct={pct} playing={playing} local={local} controlledMax={controlledMax} />
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
        {visual}
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
