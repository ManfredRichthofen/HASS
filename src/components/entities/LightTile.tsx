import { useLight } from 'hass-react'
import { Lightbulb } from 'lucide-react'
import { type PointerEvent, useEffect, useState } from 'react'
import { ColorPicker } from '#/components/entities/ColorPicker'
import { Drawer, DrawerContent } from '#/components/ui/drawer'
import { Slider } from '#/components/ui/slider'
import { Switch } from '#/components/ui/switch'
import { notify } from '#/components/ui/toast'
import { cn } from '#/lib/cn'
import { entityName, simpleToggleLights } from '#/lib/entityName'
import { AnimatePresence, expandCollapse, m, snappy, tap } from '#/lib/motion'

function rgbCss(rgb?: [number, number, number] | null) {
  if (!rgb) return undefined
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

export function LightTile({ entityId }: { entityId: string }) {
  // useLight only accepts light.* — callers must not pass switch.* or other domains.
  const light = useLight(entityId)
  const [open, setOpen] = useState(false)
  const [brightnessPct, setBrightnessPct] = useState(
    Math.max(1, Math.round(light.brightnessPercent) || 1),
  )
  const name = entityName(entityId, light.attributes.friendly_name)
  const unavailable = light.isUnavailable
  const isSimple = simpleToggleLights.has(entityId)
  const canDim =
    !isSimple &&
    (light.supportsBrightness ||
      (light.attributes.supported_color_modes ?? []).some((m) =>
        ['brightness', 'color_temp', 'hs', 'xy', 'rgb', 'rgbw', 'rgbww'].includes(m),
      ))
  const canColor = !isSimple && light.supportsRgb
  const showInlineDimmer = canDim && light.isOn && !unavailable
  const hasColorDrawer =
    canColor ||
    (light.supportsColorTemp &&
      light.minColorTempKelvin != null &&
      light.maxColorTempKelvin != null)

  const iconStyle =
    light.isOn && canColor && light.rgbColor
      ? { backgroundColor: rgbCss(light.rgbColor), color: 'var(--color-canvas)' }
      : undefined

  useEffect(() => {
    setBrightnessPct(Math.max(1, Math.round(light.brightnessPercent) || 1))
  }, [light.brightnessPercent, light.isOn])

  async function handleToggle() {
    try {
      await light.toggle()
    } catch (e) {
      notify('Light failed', e instanceof Error ? e.message : 'Unknown error')
    }
  }

  async function commitBrightness(pct: number) {
    try {
      await light.setBrightness(Math.round((pct / 100) * 255))
    } catch (e) {
      notify('Brightness failed', e instanceof Error ? e.message : 'Error')
    }
  }

  async function setColor(rgb: [number, number, number]) {
    try {
      await light.setRgbColor(rgb)
    } catch (e) {
      notify('Color failed', e instanceof Error ? e.message : 'Error')
    }
  }

  function stopSliderPointer(e: PointerEvent) {
    e.stopPropagation()
  }

  return (
    <>
      <div
        className={cn(
          'relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border p-3.5 transition-state',
          showInlineDimmer ? 'min-h-[9.5rem]' : 'min-h-[7.25rem]',
          light.isOn ? 'bg-on border-transparent' : 'border-border-subtle bg-surface',
          unavailable && 'opacity-40',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <m.button
            type="button"
            disabled={unavailable}
            onClick={() => void handleToggle()}
            whileTap={tap.soft}
            transition={snappy}
            className="flex min-h-11 min-w-0 flex-1 items-start gap-3 text-left"
          >
            <span
              className={cn(
                'grid size-11 shrink-0 place-items-center rounded-xl transition-state',
                !iconStyle &&
                  (light.isOn ? 'bg-white/20 text-white' : 'bg-icon-well text-ink-muted'),
              )}
              style={iconStyle}
            >
              <Lightbulb className="size-5" />
            </span>
            <span className="min-w-0 pt-1">
              <span className="line-clamp-2 block text-sm font-semibold text-ink">{name}</span>
              <span
                className={cn(
                  'mt-0.5 block text-xs',
                  light.isOn ? 'text-white/80' : 'text-ink-muted',
                )}
              >
                {unavailable
                  ? 'Unavailable'
                  : light.isOn
                    ? canDim
                      ? `${brightnessPct}%`
                      : 'On'
                    : 'Off'}
              </span>
            </span>
          </m.button>

          {hasColorDrawer ? (
            <button
              type="button"
              disabled={unavailable}
              aria-label={`Color for ${name}`}
              onClick={() => setOpen(true)}
              className={cn(
                'grid size-11 shrink-0 place-items-center rounded-xl text-ink-muted transition-ui',
                'hover:bg-white/10 hover:text-ink',
                (!light.isOn || unavailable) && 'opacity-50',
              )}
            >
              {canColor && light.isOn && light.rgbColor ? (
                <span
                  className="size-6 rounded-full border-2 border-white/90 shadow-md"
                  style={{ background: rgbCss(light.rgbColor) }}
                />
              ) : (
                <span
                  className="size-6 rounded-full border border-border"
                  style={{
                    background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                  }}
                />
              )}
            </button>
          ) : null}
        </div>

        <AnimatePresence initial={false}>
          {showInlineDimmer ? (
            <m.div
              key="dimmer"
              initial={expandCollapse.initial}
              animate={expandCollapse.animate}
              exit={expandCollapse.exit}
              className="overflow-hidden"
              onPointerDown={stopSliderPointer}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mt-2 min-w-0">
                <Slider
                  onCard
                  aria-label={`${name} brightness`}
                  min={1}
                  max={100}
                  step={1}
                  value={brightnessPct}
                  onValueChange={(value) => {
                    setBrightnessPct(Array.isArray(value) ? value[0] : value)
                  }}
                  onValueCommitted={(value) => {
                    const next = Array.isArray(value) ? value[0] : value
                    setBrightnessPct(next)
                    void commitBrightness(next)
                  }}
                />
              </div>
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>

      {hasColorDrawer ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent title={name}>
            <div className="space-y-6 py-2">
              <div className="flex min-h-11 items-center justify-between">
                <span className="text-sm text-ink-muted">Power</span>
                <Switch
                  checked={light.isOn}
                  disabled={unavailable}
                  onCheckedChange={() => void handleToggle()}
                />
              </div>

              {canColor ? (
                <ColorPicker
                  value={light.rgbColor}
                  disabled={unavailable || !light.isOn}
                  onChange={(rgb) => void setColor(rgb)}
                />
              ) : null}

              {light.supportsColorTemp &&
              light.minColorTempKelvin != null &&
              light.maxColorTempKelvin != null ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted">White temperature</span>
                    <span className="tabular-nums text-ink">{light.colorTemp ?? '—'}K</span>
                  </div>
                  <Slider
                    aria-label="Color temperature"
                    min={light.minColorTempKelvin}
                    max={light.maxColorTempKelvin}
                    step={50}
                    disabled={unavailable || !light.isOn}
                    value={
                      light.colorTemp ??
                      Math.round((light.minColorTempKelvin + light.maxColorTempKelvin) / 2)
                    }
                    onValueCommitted={(value) => {
                      const next = Array.isArray(value) ? value[0] : value
                      void light
                        .setColorTemp(next)
                        .catch((e) =>
                          notify('Temp failed', e instanceof Error ? e.message : 'Error'),
                        )
                    }}
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
