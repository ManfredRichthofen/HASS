import { Slider as BaseSlider } from '@base-ui/react/slider'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { asNumber } from '#/components/ui/slider'
import { useMediaQuery } from '#/hooks/useMediaQuery'
import { cn } from '#/lib/cn'

/*
 * One UI-style seek bar: a solid played bar with soft, translucent hills of
 * light rising off it and drifting while music plays, a ringed round playhead,
 * and the remaining time as a slim pill after a small gap.
 */

/** Tallest the hills rise above the bar while playing, in CSS px. */
const HILL_HEIGHT = 18
/** Room drawn above the bar for the hills (crest stroke included), in CSS px. */
const CANVAS_HEIGHT = HILL_HEIGHT + 4
/** Time constant for the hills to rise or sink, in seconds. */
const RISE_TAU = 0.28
/** Sample spacing along the hills, in CSS px. */
const SAMPLE_STEP = 3
/** Playhead diameter, in CSS px (matches size-[18px]). */
const THUMB = 18
/** Clear space between the playhead and the remaining bar, in CSS px. */
const GAP = 5

/**
 * Four overlapping translucent layers, each a long swell times a shorter ripple, so
 * the band has uneven bumps along its whole length. Different wavelengths and speeds
 * keep the shape from ever visibly repeating; overlaps read brighter.
 */
const LAYERS = [
  { long: 190, short: 70, speed: 0.07, scale: 1, alpha: 0.46 },
  { long: 130, short: 52, speed: -0.1, scale: 0.85, alpha: 0.4 },
  { long: 95, short: 38, speed: 0.14, scale: 0.65, alpha: 0.4 },
  { long: 240, short: 88, speed: -0.05, scale: 0.9, alpha: 0.3 },
] as const

/** `rgb(…)`/`rgba(…)` from getComputedStyle, at the given opacity. */
const withAlpha = (color: string, alpha: number) => {
  const [r = 0, g = 0, b = 0] = color.match(/[\d.]+/g)?.map(Number) ?? []
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Smooth 0→1 ramp, so the envelope has no visible corners. */
const ease = (t: number) => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

type WaveformSeekProps = {
  /** Controlled position; the caller owns any in-progress drag value. */
  value: number
  max: number
  disabled?: boolean
  seekable?: boolean
  /** When true the hills rise and drift; otherwise they sink into the bar. */
  playing?: boolean
  'aria-label'?: string
  onValueChange?: (value: number) => void
  onValueCommitted?: (value: number) => void
  className?: string
}

type HillsProps = {
  playing: boolean
  /** Scrubbing: the hills sink and the playhead grows. */
  dragging: boolean
  value: number
  max: number
}

/** The bar pieces the frame loop moves between the caller's once-a-second updates. */
type BarRefs = {
  played: RefObject<HTMLSpanElement | null>
  remaining: RefObject<HTMLSpanElement | null>
  head: RefObject<HTMLSpanElement | null>
}

const remainingLeft = (pct: number) => `min(100%, calc(${pct}% + ${THUMB / 2 + GAP}px))`

/**
 * The hills, drawn on a canvas imperatively so playback never re-renders React
 * at 60fps. The frame loop runs only while the hills drift or rise/sink; when
 * settled it repaints once per position, size or theme change.
 */
function Hills({ playing, dragging, value, max, bars }: HillsProps & { bars: BarRefs }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const anim = useRef({ phases: LAYERS.map(() => Math.random() * 10), height: 0, frame: 0 })
  const live = useRef({ playing, dragging, value, max, reduceMotion })
  live.current = { playing, dragging, value, max, reduceMotion }
  // When `value` last changed, so the frame loop can glide on to the next whole second.
  const anchor = useRef({ value, at: 0 })
  if (anchor.current.value !== value) anchor.current = { value, at: performance.now() }

  /**
   * Position to draw: the caller's value, carried forward while playing. Steady progress
   * isn't decorative motion, so this runs with reduced motion too. Capped a little past
   * 1 s so a late tick holds briefly instead of running ahead.
   */
  const shownValue = useCallback(() => {
    const { playing: isPlaying, dragging: scrubbing, value: v, max: m } = live.current
    if (!isPlaying || scrubbing || !anchor.current.at) return v
    const ahead = Math.min(1.25, (performance.now() - anchor.current.at) / 1000)
    return Math.min(m, v + ahead)
  }, [])

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    if (width <= 0) return
    if (canvas.width !== Math.round(width * dpr)) {
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(CANVAS_HEIGHT * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, CANVAS_HEIGHT)

    const { height, phases } = anim.current
    const { max: m } = live.current
    const v = shownValue()
    // Move the bar with the hills, so neither steps once a second.
    const pct = (v / m) * 100
    if (bars.played.current) bars.played.current.style.width = `${pct}%`
    if (bars.remaining.current) bars.remaining.current.style.left = remainingLeft(pct)
    if (bars.head.current) bars.head.current.style.left = `${pct}%`
    // The hills sit on the played bar and fade out just before the playhead.
    const span = (v / m) * width - THUMB / 2
    if (height < 0.2 || span < 8) return

    // Theme color, read from CSS so light, dark and every theme just work.
    const color = getComputedStyle(canvas).color
    const base = CANVAS_HEIGHT
    // A low band along the whole played bar: it reaches full height within the first
    // stretch, eases in from the start and tapers off just before the playhead.
    const peak = height * ease(span / 50)
    const riseIn = Math.min(60, span * 0.3)
    const fadeOut = Math.min(28, span * 0.25)

    LAYERS.forEach((layer, i) => {
      const phase = phases[i] ?? 0
      const top: Array<[number, number]> = []
      for (let x = 0; x <= span; x += SAMPLE_STEP) {
        const envelope = ease(x / riseIn) * ease((span - x) / fadeOut)
        const swell =
          (0.5 + 0.5 * Math.sin((x / layer.long) * Math.PI * 2 - phase)) *
          (0.55 + 0.45 * Math.sin((x / layer.short) * Math.PI * 2 + phase * 1.7))
        top.push([x, base - peak * layer.scale * envelope * swell])
      }
      top.push([span, base])

      // Body: a soft translucent sheet, strongest at the crest and still lit where it meets the bar.
      const fill = ctx.createLinearGradient(0, base - peak * layer.scale, 0, base)
      fill.addColorStop(0, color)
      fill.addColorStop(1, withAlpha(color, 0.45))
      ctx.globalAlpha = layer.alpha
      ctx.fillStyle = fill
      ctx.beginPath()
      ctx.moveTo(0, base)
      for (const [x, y] of top) ctx.lineTo(x, y)
      ctx.closePath()
      ctx.fill()

      // A fine, brighter crest line along the top of each layer.
      ctx.globalAlpha = Math.min(1, layer.alpha * 2.2)
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.lineJoin = 'round'
      ctx.beginPath()
      for (const [j, [x, y]] of top.slice(0, -1).entries()) {
        if (j === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    })
    ctx.globalAlpha = 1
  }, [bars, shownValue])

  const startLoop = useCallback(() => {
    const a = anim.current
    if (a.frame) return
    let lastTs = performance.now()
    const tick = (ts: number) => {
      const dt = Math.min(0.05, (ts - lastTs) / 1000)
      lastTs = ts
      const { playing: isPlaying, dragging: scrubbing, reduceMotion: still } = live.current

      // Paused or scrubbing → the hills sink into the bar. Reduced motion → they hold still.
      const target = isPlaying && !scrubbing ? HILL_HEIGHT : 0
      if (still) {
        a.height = target
      } else {
        a.height += (target - a.height) * (1 - Math.exp(-dt / RISE_TAU))
        if (Math.abs(target - a.height) < 0.05) a.height = target
      }

      const drifting = !still && a.height > 0
      if (drifting) {
        a.phases = a.phases.map((p, i) => p + dt * (LAYERS[i]?.speed ?? 0) * Math.PI * 2)
      }

      paint()
      // Keep going while playing even with the hills still, so the bar glides.
      const gliding = isPlaying && !scrubbing
      a.frame = drifting || gliding || a.height !== target ? requestAnimationFrame(tick) : 0
    }
    a.frame = requestAnimationFrame(tick)
  }, [paint])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => paint())
    observer.observe(canvas)
    // Theme switches change the CSS color; repaint when the page's theme attributes change.
    const themeObserver = new MutationObserver(() => paint())
    themeObserver.observe(document.documentElement, { attributes: true })
    return () => {
      observer.disconnect()
      themeObserver.disconnect()
      cancelAnimationFrame(anim.current.frame)
      anim.current.frame = 0
    }
  }, [paint])

  // biome-ignore lint/correctness/useExhaustiveDependencies: playing/dragging/reduceMotion are read via live ref; they are the restart triggers
  useEffect(() => startLoop(), [startLoop, playing, dragging, reduceMotion])

  // biome-ignore lint/correctness/useExhaustiveDependencies: value/max are read via live ref; they are the repaint triggers
  useEffect(() => {
    if (!anim.current.frame) paint()
  }, [paint, value, max])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-x-0 w-full text-ink glass:text-on-raised"
      style={{ height: CANVAS_HEIGHT, bottom: '50%' }}
      aria-hidden
    />
  )
}

/** Bars, hills and playhead. The slider's own thumb stays invisible on top for focus and drag. */
function SeekVisual({ playing, dragging, value, max }: HillsProps) {
  const pct = (value / max) * 100
  const played = useRef<HTMLSpanElement>(null)
  const remaining = useRef<HTMLSpanElement>(null)
  const head = useRef<HTMLSpanElement>(null)
  const bars = useRef<BarRefs>({ played, remaining, head }).current
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-1/2 h-7 -translate-y-1/2"
      aria-hidden
    >
      <Hills playing={playing} dragging={dragging} value={value} max={max} bars={bars} />
      {/* Played: solid, running into the playhead. */}
      <span
        ref={played}
        className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-pill bg-ink glass:bg-on-raised"
        style={{ width: `${pct}%` }}
      />
      {/* Remaining: a slim pill that starts just past the playhead. */}
      <span
        ref={remaining}
        className="absolute top-1/2 right-0 h-1.5 -translate-y-1/2 rounded-pill bg-ink/30 glass:bg-on-raised/35"
        style={{ left: remainingLeft(pct) }}
      />
      {/* Ringed playhead; grows a little while scrubbing. */}
      <span
        ref={head}
        className={cn(
          'absolute top-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-pill border-[3px] border-ink bg-on-ink shadow-card',
          'glass:border-on-raised',
          'transition-[scale] duration-fast ease-out motion-reduce:transition-none',
          dragging && 'scale-125',
        )}
        style={{ left: `${pct}%` }}
      />
    </div>
  )
}

/**
 * One UI-style seek bar. Hills of light rise off the played bar and drift while
 * music plays, sink into it when paused or while scrubbing, and hold still with
 * reduced motion.
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
  const [dragging, setDragging] = useState(false)
  const visual = <SeekVisual playing={playing} dragging={dragging} value={clamped} max={safeMax} />

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
        <div className="relative h-7">{visual}</div>
      </div>
    )
  }

  return (
    <BaseSlider.Root
      className={cn('relative w-full min-w-0 touch-pan-y select-none', className)}
      min={0}
      max={safeMax}
      step={1}
      disabled={disabled}
      value={clamped}
      onValueChange={(next) => {
        setDragging(true)
        onValueChange?.(asNumber(next))
      }}
      onValueCommitted={(next) => {
        setDragging(false)
        onValueCommitted?.(asNumber(next))
      }}
    >
      <BaseSlider.Control className="relative flex w-full min-w-0 cursor-pointer touch-pan-y py-4">
        {visual}
        <BaseSlider.Track className="relative h-7 w-full min-w-0 grow bg-transparent">
          <BaseSlider.Indicator className="absolute h-full bg-transparent" />
          <BaseSlider.Thumb
            aria-label={ariaLabel}
            className={cn(
              'size-6 rounded-pill bg-transparent outline-none',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            )}
          />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  )
}
