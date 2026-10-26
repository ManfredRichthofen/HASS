import { useLight } from 'hass-react'
import {
  Ellipsis,
  LampCeiling,
  LampDesk,
  LampFloor,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react'
import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { ColorPicker } from '#/components/entities/ColorPicker'
import { Drawer, DrawerContent } from '#/components/ui/drawer'
import { LabeledSlider } from '#/components/ui/slider'
import { Switch } from '#/components/ui/switch'
import { notify } from '#/components/ui/toast'
import { useOptimisticValue } from '#/hooks/useOptimisticValue'
import { SCROLL_PRESS_THRESHOLD } from '#/hooks/useScrollSafePress'
import { cn } from '#/lib/cn'
import { entityName, simpleToggleLights } from '#/lib/entityName'

function rgbCss(rgb?: [number, number, number] | null) {
  if (!rgb) return undefined
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

/** Pick a fixture icon from the light's name so tiles don't all look the same. */
function fixtureIcon(name: string): LucideIcon {
  const n = name.toLowerCase()
  if (/pendant|ceiling|chandelier|overhead|can\b|recessed/.test(n)) return LampCeiling
  if (/floor/.test(n)) return LampFloor
  if (/desk|lamp|reading|bedside|nightstand/.test(n)) return LampDesk
  return Lightbulb
}

/** Hold briefly before a vertical drag can dim — otherwise scroll always wins. */
const DIM_HOLD_MS = 180
/** Minimum gap between live brightness calls while dragging. */
const LIVE_UPDATE_MS = 250
/** Ignore HA echoes of in-flight live updates for this long after release. */
const SETTLE_MS = 1500

type GesturePhase = 'idle' | 'armed' | 'dimming'

const clampLevel = (pct: number) => Math.max(1, Math.min(100, Math.round(pct)))

const buzz = (ms: number) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms)
}

type DragGesture = {
  pointerId: number
  x: number
  y: number
  lastX: number
  lastY: number
  start: number
  level: number
  /** True after DIM_HOLD_MS — vertical drag may dim. */
  armed: boolean
  dimming: boolean
  /** Page scrolled (or similar) — do not toggle on the following click. */
  cancelled: boolean
}

/**
 * The tile IS the light: tap to toggle, hold then drag up or down to dim.
 * The lamp follows the finger live (throttled), and dragging an off light up
 * turns it on at that level.
 * When on, the tile fills with light and the part above the brightness level
 * is shaded, like liquid in a glass (Modern shows a level bar instead). The
 * small "more" target opens a sheet for colour and white temperature.
 *
 * Mobile rules:
 * - Never toggle on pointerup (WebViews scroll without pointermove, then still
 *   fire pointerup). Toggle is click-only, suppressed after scroll/drag.
 * - Finger jitter during the hold must NOT cancel arming.
 * - Once dimming, touchmove is non-passive so we can preventDefault and stop
 *   the page stealing the gesture (touch-action cannot change mid-touch).
 */
export function LightTile({ entityId, className }: { entityId: string; className?: string }) {
  // useLight only accepts light.* — callers must not pass switch.* or other domains.
  const light = useLight(entityId)
  const [open, setOpen] = useState(false)
  const haLevel = Math.max(1, Math.round(light.brightnessPercent) || 1)
  const [level, setLevel] = useState(haLevel)
  const [phase, setPhase] = useState<GesturePhase>('idle')
  const drag = useRef<DragGesture | null>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const liveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastLiveSentAt = useRef(0)
  const settling = useRef(false)
  const haLevelRef = useRef(haLevel)
  const suppressClick = useRef(false)
  const detachScrollGuards = useRef<(() => void) | null>(null)
  const tileRef = useRef<HTMLDivElement>(null)
  // Live flags for scroll guards (closures from pointerdown must not go stale).
  const onRef = useRef(false)
  const canDimRef = useRef(false)

  const name = entityName(entityId, light.attributes.friendly_name)
  const unavailable = light.isUnavailable
  const isSimple = simpleToggleLights.has(entityId)
  const canDim =
    !isSimple &&
    (light.supportsBrightness ||
      (light.attributes.supported_color_modes ?? []).some((mode) =>
        ['brightness', 'color_temp', 'hs', 'xy', 'rgb', 'rgbw', 'rgbww'].includes(mode),
      ))
  const canColor = !isSimple && light.supportsRgb
  const minK = light.minColorTempKelvin
  const maxK = light.maxColorTempKelvin
  const canTemp = !isSimple && light.supportsColorTemp && minK != null && maxK != null
  const hasSheet = canColor || canTemp || canDim
  const {
    value: on,
    commit: commitOn,
    setOverride: setOnOverride,
  } = useOptimisticValue(light.isOn && !unavailable)
  const dimming = phase === 'dimming'
  const lit = on || dimming
  const swatch = on && canColor ? rgbCss(light.rgbColor) : undefined
  const Icon = fixtureIcon(name)
  onRef.current = on
  canDimRef.current = canDim
  haLevelRef.current = haLevel

  useEffect(() => {
    if (drag.current?.dimming || settling.current) return
    setLevel(haLevel)
  }, [haLevel])

  useEffect(
    () => () => {
      detachScrollGuards.current?.()
      for (const timer of [holdTimer, liveTimer, settleTimer]) {
        if (timer.current != null) clearTimeout(timer.current)
      }
    },
    [],
  )

  const clearHoldTimer = () => {
    if (holdTimer.current == null) return
    clearTimeout(holdTimer.current)
    holdTimer.current = null
  }

  const cancelPress = () => {
    const d = drag.current
    if (d?.dimming) return
    if (d) d.cancelled = true
    suppressClick.current = true
    clearHoldTimer()
    setPhase('idle')
  }

  const endGesture = () => {
    clearHoldTimer()
    detachScrollGuards.current?.()
    detachScrollGuards.current = null
    drag.current = null
    setPhase('idle')
  }

  const toggle = () => {
    commitOn(!on, async () => {
      try {
        await light.toggle()
      } catch (e) {
        notify('Light failed', e instanceof Error ? e.message : 'Unknown error')
        throw e
      }
    })
  }

  const sendLevel = (pct: number) => light.setBrightness(Math.round((pct / 100) * 255))

  const clearLiveTimer = () => {
    if (liveTimer.current == null) return
    clearTimeout(liveTimer.current)
    liveTimer.current = null
  }

  const sendLiveLevel = (pct: number) => {
    lastLiveSentAt.current = Date.now()
    // Live updates are best-effort; the release commit reports failures.
    void sendLevel(pct).catch(() => {})
  }

  /** Throttled leading + trailing update so the lamp tracks the finger. */
  const scheduleLiveLevel = (pct: number) => {
    clearLiveTimer()
    const wait = LIVE_UPDATE_MS - (Date.now() - lastLiveSentAt.current)
    if (wait <= 0) {
      sendLiveLevel(pct)
      return
    }
    liveTimer.current = setTimeout(() => {
      liveTimer.current = null
      sendLiveLevel(pct)
    }, wait)
  }

  const resyncLevel = () => {
    settling.current = false
    setLevel(haLevelRef.current)
  }

  async function commitLevel(pct: number) {
    clearLiveTimer()
    if (settleTimer.current != null) clearTimeout(settleTimer.current)
    settling.current = true
    try {
      await sendLevel(pct)
      settleTimer.current = setTimeout(resyncLevel, SETTLE_MS)
    } catch (e) {
      setOnOverride(null)
      resyncLevel()
      notify('Brightness failed', e instanceof Error ? e.message : 'Error')
    }
  }

  function updateDimLevel(clientY: number) {
    const d = drag.current
    if (!d) return
    const dy = d.y - clientY
    const height = tileRef.current?.offsetHeight ?? 160
    const next = clampLevel(d.start + (dy / height) * 100)
    if (next === d.level) return
    if ((next === 1 || next === 100) && d.level !== next) buzz(6)
    d.level = next
    setLevel(next)
    if (!onRef.current) setOnOverride(true)
    scheduleLiveLevel(next)
  }

  function beginDim(clientY: number, target: HTMLElement) {
    const d = drag.current
    if (!d || d.dimming || d.cancelled) return
    d.dimming = true
    // Re-base so brightness does not jump from jitter during the hold.
    d.y = clientY
    d.start = d.level
    suppressClick.current = true
    clearHoldTimer()
    setPhase('dimming')
    try {
      target.setPointerCapture(d.pointerId)
    } catch {
      // Capture can fail if the pointer already ended.
    }
    updateDimLevel(clientY)
  }

  /** @returns whether this move was claimed as a dim gesture */
  function handleMove(clientX: number, clientY: number, target: HTMLElement): boolean {
    const d = drag.current
    if (!d || d.cancelled) return false

    d.lastX = clientX
    d.lastY = clientY

    if (d.dimming) {
      updateDimLevel(clientY)
      return true
    }

    // Still holding to arm — ignore jitter so the timer can finish.
    if (!d.armed) return false

    const absX = Math.abs(clientX - d.x)
    const absY = Math.abs(clientY - d.y)
    if (absX * absX + absY * absY < SCROLL_PRESS_THRESHOLD * SCROLL_PRESS_THRESHOLD) return false

    if (canDimRef.current && absY > absX) {
      beginDim(clientY, target)
      return true
    }

    // Horizontal (or light off) after hold — not a dim; suppress tap.
    suppressClick.current = true
    return false
  }

  function attachScrollGuards(target: HTMLElement) {
    detachScrollGuards.current?.()

    const onScroll = () => {
      cancelPress()
    }

    // Non-passive: once we claim a dim, preventDefault stops the WebView scroll.
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      if (handleMove(t.clientX, t.clientY, target)) {
        e.preventDefault()
      }
    }

    window.addEventListener('scroll', onScroll, true)
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true })

    detachScrollGuards.current = () => {
      window.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('touchmove', onTouchMove, true)
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (unavailable) return
    // Do not capture yet — the page must still be able to scroll.
    suppressClick.current = false
    drag.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      start: level,
      level,
      armed: false,
      dimming: false,
      cancelled: false,
    }
    attachScrollGuards(e.currentTarget)
    clearHoldTimer()
    holdTimer.current = setTimeout(() => {
      const d = drag.current
      if (!d || d.cancelled) return
      d.armed = true
      // Fresh origin after the hold so the first drag does not include jitter.
      d.x = d.lastX
      d.y = d.lastY
      if (!canDimRef.current) return
      setPhase('armed')
      buzz(10)
    }, DIM_HOLD_MS)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    handleMove(e.clientX, e.clientY, e.currentTarget)
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    const wasDimming = d?.dimming ?? false
    const levelToCommit = d?.level ?? level
    const samePointer = d?.pointerId === e.pointerId

    if (d && !wasDimming) {
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      if (dx * dx + dy * dy >= SCROLL_PRESS_THRESHOLD * SCROLL_PRESS_THRESHOLD) {
        suppressClick.current = true
      }
    }
    if (d?.cancelled || wasDimming) suppressClick.current = true

    endGesture()
    // Never toggle here — mobile scroll often ends in pointerup without move events.
    if (!d || unavailable || !samePointer || !wasDimming) return
    void commitLevel(levelToCommit)
  }

  function onPointerCancel() {
    suppressClick.current = true
    endGesture()
  }

  function onClick(e: MouseEvent<HTMLDivElement>) {
    if (unavailable || suppressClick.current) {
      e.preventDefault()
      e.stopPropagation()
      suppressClick.current = false
      return
    }
    toggle()
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (unavailable) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggle()
    } else if (on && canDim && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      const next = clampLevel(level + (e.key === 'ArrowUp' ? 10 : -10))
      setLevel(next)
      void commitLevel(next)
    }
  }

  const state = unavailable ? 'Unavailable' : lit ? (canDim ? `${level}%` : 'On') : 'Off'

  return (
    <>
      <div
        ref={tileRef}
        role="switch"
        tabIndex={unavailable ? -1 : 0}
        aria-checked={on}
        aria-disabled={unavailable}
        aria-label={`${name}, ${state}${canDim ? '. Hold and drag, or use arrow keys, to dim' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={onClick}
        onKeyDown={onKeyDown}
        style={{ '--lvl': `${lit ? level : 100}%` } as React.CSSProperties}
        className={cn(
          'group relative flex rounded-card border-ui border-border-subtle bg-surface shadow-card modern:border-transparent aspect-[1/1.12] min-h-38 cursor-pointer flex-col justify-between overflow-hidden p-4.5 text-left select-none',
          'transition-[background-color,box-shadow,transform] duration-slow ease-out',
          phase === 'idle' && 'active:scale-[0.97]',
          phase !== 'idle' && 'scale-[1.03] shadow-press',
          'walnut:aspect-[1/1.2]',
          'modern:aspect-auto modern:min-h-34 modern:pb-8',
          on && 'bg-on border-transparent shadow-on',
          on &&
            'modern:bg-none modern:bg-surface modern:text-ink modern:shadow-[inset_0_0_0_2px_var(--c-on-to)]',
          unavailable && 'cursor-default opacity-45',
          className,
        )}
      >
        {/* Shade above the level: the "empty" part of the glass. */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 h-0 border-b border-transparent bg-white/36',
            !dimming && 'transition-[height] duration-200',
            lit && canDim && 'h-[calc(100%-var(--lvl))] border-black/8',
            'modern:hidden glass:bg-black/[0.05]',
          )}
        />
        {/* Modern: a level bar along the bottom instead of a fill. */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-4.5 bottom-3.5 hidden h-1 rounded-pill bg-surface-hover modern:block',
            on &&
              'bg-[linear-gradient(90deg,var(--c-on-to)_var(--lvl),var(--c-surface-hover)_var(--lvl))]',
          )}
        />

        <div className="relative flex items-start justify-between">
          <span
            className={cn(
              'text-ink-faint',
              on && 'text-on-ink',
              'modern:grid modern:size-10 modern:place-items-center modern:rounded-pill modern:bg-surface-hover modern:text-ink-muted',
              on && 'modern:bg-on modern:text-on-ink',
            )}
          >
            <Icon className="size-[22px]" />
          </span>
          {hasSheet ? (
            <button
              type="button"
              aria-label={`${name} settings`}
              disabled={unavailable}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(true)
              }}
              className={cn(
                '-mt-2.5 -mr-2.5 grid size-11 place-items-center rounded-pill text-ink-faint transition-ui hover:bg-black/5',
                on && 'text-on-ink modern:text-ink-muted',
              )}
            >
              {swatch ? (
                <span
                  className="size-3.5 rounded-pill ring-2 ring-white/80"
                  style={{ background: swatch }}
                />
              ) : (
                <Ellipsis className="size-[18px]" />
              )}
            </button>
          ) : null}
        </div>

        <div className="relative grid gap-1.5">
          <span
            className={cn(
              lit && canDim
                ? 'text-display text-[1.75rem] leading-none tabular-nums modern:text-2xl'
                : 'text-[0.8125rem] text-ink-muted',
              on && 'text-on-ink modern:text-ink',
            )}
          >
            {state}
          </span>
          <span
            className={cn(
              'line-clamp-2 text-[0.9375rem] leading-5 font-semibold text-ink',
              on && 'text-on-ink modern:text-ink',
            )}
          >
            {name}
          </span>
        </div>
      </div>

      {hasSheet ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent
            title={name}
            description={unavailable ? 'Unavailable' : on ? `On · ${level}%` : 'Off'}
          >
            <div className="grid gap-6 py-2">
              <div className="flex min-h-11 items-center justify-between">
                <span className="text-label">Power</span>
                <Switch checked={on} disabled={unavailable} onCheckedChange={() => toggle()} />
              </div>

              {canDim ? (
                <LabeledSlider
                  label="Brightness"
                  tone="light"
                  min={1}
                  max={100}
                  step={1}
                  disabled={!on}
                  value={level}
                  format={(v) => `${v}%`}
                  onValueCommitted={(value) => {
                    const next = Array.isArray(value) ? (value[0] ?? level) : value
                    setLevel(next)
                    void commitLevel(next)
                  }}
                />
              ) : null}

              {canTemp ? (
                <LabeledSlider
                  label="White temperature"
                  tone="light"
                  min={minK ?? 2200}
                  max={maxK ?? 6500}
                  step={50}
                  disabled={!on}
                  format={(v) => `${v}K`}
                  value={light.colorTemp ?? Math.round(((minK ?? 2200) + (maxK ?? 6500)) / 2)}
                  onValueCommitted={(value) => {
                    const next = Array.isArray(value) ? (value[0] ?? minK ?? 2200) : value
                    void light
                      .setColorTemp(next)
                      .catch((e) =>
                        notify('Temperature failed', e instanceof Error ? e.message : 'Error'),
                      )
                  }}
                />
              ) : null}

              {canColor ? (
                <div className="grid gap-2.5">
                  <span className="text-label">Colour</span>
                  <ColorPicker
                    value={light.rgbColor}
                    disabled={!on}
                    onChange={(rgb) =>
                      void light
                        .setRgbColor(rgb)
                        .catch((e) =>
                          notify('Colour failed', e instanceof Error ? e.message : 'Error'),
                        )
                    }
                  />
                </div>
              ) : null}
            </div>
          </DrawerContent>
        </Drawer>
      ) : null}
    </>
  )
}
