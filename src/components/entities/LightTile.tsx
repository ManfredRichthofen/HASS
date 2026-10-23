import { useLight } from 'hass-react'
import {
  Ellipsis,
  LampCeiling,
  LampDesk,
  LampFloor,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react'
import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react'
import { ColorPicker } from '#/components/entities/ColorPicker'
import { Drawer, DrawerContent } from '#/components/ui/drawer'
import { LabeledSlider } from '#/components/ui/slider'
import { Switch } from '#/components/ui/switch'
import { notify } from '#/components/ui/toast'
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

const DRAG_THRESHOLD = 6

/**
 * The tile IS the light: tap to toggle, drag up or down to dim. When on, the
 * tile fills with light and the part above the brightness level is shaded,
 * like liquid in a glass (Modern shows a level bar instead). The small "more"
 * target opens a sheet for colour and white temperature.
 */
export function LightTile({ entityId }: { entityId: string }) {
  // useLight only accepts light.* — callers must not pass switch.* or other domains.
  const light = useLight(entityId)
  const [open, setOpen] = useState(false)
  const haLevel = Math.max(1, Math.round(light.brightnessPercent) || 1)
  const [level, setLevel] = useState(haLevel)
  const drag = useRef<{ y: number; start: number; moved: boolean } | null>(null)
  const tileRef = useRef<HTMLDivElement>(null)

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
  const on = light.isOn && !unavailable
  const swatch = on && canColor ? rgbCss(light.rgbColor) : undefined
  const Icon = fixtureIcon(name)

  useEffect(() => {
    if (!drag.current) setLevel(haLevel)
  }, [haLevel])

  async function toggle() {
    try {
      await light.toggle()
    } catch (e) {
      notify('Light failed', e instanceof Error ? e.message : 'Unknown error')
    }
  }

  async function commitLevel(pct: number) {
    try {
      await light.setBrightness(Math.round((pct / 100) * 255))
    } catch (e) {
      notify('Brightness failed', e instanceof Error ? e.message : 'Error')
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (unavailable) return
    drag.current = { y: e.clientY, start: level, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || !on || !canDim) return
    const dy = d.y - e.clientY
    if (!d.moved && Math.abs(dy) < DRAG_THRESHOLD) return
    d.moved = true
    const height = tileRef.current?.offsetHeight ?? 160
    setLevel(Math.max(1, Math.min(100, Math.round(d.start + (dy / height) * 100))))
  }

  function onPointerUp() {
    const d = drag.current
    drag.current = null
    if (!d || unavailable) return
    if (d.moved) void commitLevel(level)
    else void toggle()
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (unavailable) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      void toggle()
    } else if (on && canDim && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      const next = Math.max(1, Math.min(100, level + (e.key === 'ArrowUp' ? 10 : -10)))
      setLevel(next)
      void commitLevel(next)
    }
  }

  const state = unavailable ? 'Unavailable' : on ? (canDim ? `${level}%` : 'On') : 'Off'

  return (
    <>
      <div
        ref={tileRef}
        role="switch"
        tabIndex={unavailable ? -1 : 0}
        aria-checked={on}
        aria-disabled={unavailable}
        aria-label={`${name}, ${state}${on && canDim ? '. Drag or use arrow keys to dim' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null
        }}
        onKeyDown={onKeyDown}
        style={{ '--lvl': `${on ? level : 100}%` } as React.CSSProperties}
        className={cn(
          'group relative flex rounded-card border-ui border-border-subtle bg-surface shadow-card modern:border-transparent aspect-[1/1.12] min-h-38 cursor-pointer touch-none flex-col justify-between overflow-hidden p-4.5 text-left select-none',
          'transition-[background-color,box-shadow,transform] duration-slow active:scale-[0.97]',
          'walnut:aspect-[1/1.2]',
          'modern:aspect-auto modern:min-h-34 modern:pb-8',
          'brutal:active:translate-x-[3px] brutal:active:translate-y-[3px] brutal:active:scale-100 brutal:active:shadow-none',
          on && 'bg-on border-transparent shadow-on brutal:border-ink',
          on &&
            'modern:bg-none modern:bg-surface modern:text-ink modern:shadow-[inset_0_0_0_2px_var(--c-on-to)]',
          unavailable && 'cursor-default opacity-45',
        )}
      >
        {/* Shade above the level: the "empty" part of the glass. */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 h-0 border-b border-transparent bg-white/36 transition-[height] duration-200',
            on && canDim && 'h-[calc(100%-var(--lvl))] border-black/8',
            'modern:hidden glass:bg-black/[0.05]',
            'brutal:bg-[repeating-linear-gradient(-45deg,#11111114_0_2px,transparent_2px_8px)] brutal:border-b-2',
            on && canDim && 'brutal:border-ink',
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
              on && canDim
                ? 'text-display text-[1.75rem] leading-none tabular-nums modern:text-2xl'
                : 'text-[0.8125rem] text-ink-muted brutal:font-label brutal:text-xs',
              on && 'text-on-ink modern:text-ink',
            )}
          >
            {state}
          </span>
          <span
            className={cn(
              'line-clamp-2 text-[0.9375rem] leading-5 font-semibold text-ink',
              on && 'text-on-ink modern:text-ink',
              'brutal:font-bold brutal:uppercase brutal:tracking-[-0.01em]',
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
                <Switch checked={on} disabled={unavailable} onCheckedChange={() => void toggle()} />
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
                    const next = Array.isArray(value) ? (value[0] ?? level) : value
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
