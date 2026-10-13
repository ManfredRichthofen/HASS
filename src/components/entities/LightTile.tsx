import { useEffect, useState, type PointerEvent } from 'react'
import { useLight } from 'hass-react'
import { Lightbulb } from 'lucide-react'
import { entityName, simpleToggleLights } from '#/lib/entityName'
import { cn } from '#/lib/cn'
import { ColorPicker } from '#/components/entities/ColorPicker'
import { Drawer, DrawerContent } from '#/components/ui/drawer'
import { Slider } from '#/components/ui/slider'
import { Switch } from '#/components/ui/switch'
import { notify } from '#/components/ui/toast'

function rgbCss(rgb?: [number, number, number] | null) {
  if (!rgb) return undefined
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

export function LightTile({ entityId }: { entityId: string }) {
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
          'relative flex flex-col justify-between rounded-3xl border p-4 transition',
          showInlineDimmer ? 'min-h-[9.5rem]' : 'min-h-[7.5rem]',
          light.isOn
            ? 'border-accent/35 bg-accent-soft shadow-[inset_0_0_0_1px_#e8a54b22]'
            : 'border-border-subtle bg-surface',
          unavailable && 'opacity-40',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            disabled={unavailable}
            onClick={() => void handleToggle()}
            className="flex min-w-0 flex-1 items-start gap-3 text-left active:scale-[0.98]"
          >
            <span
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-2xl',
                light.isOn ? 'bg-accent/25 text-accent' : 'bg-canvas text-ink-muted',
              )}
              style={
                light.isOn && canColor && light.rgbColor
                  ? {
                      backgroundColor: `${rgbCss(light.rgbColor)}33`,
                      color: rgbCss(light.rgbColor),
                    }
                  : undefined
              }
            >
              <Lightbulb className="size-5" />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="line-clamp-2 block text-sm font-semibold text-ink">
                {name}
              </span>
              <span className="mt-0.5 block text-xs text-ink-muted">
                {unavailable
                  ? 'Unavailable'
                  : light.isOn
                    ? canDim
                      ? `${brightnessPct}%`
                      : 'On'
                    : 'Off'}
              </span>
            </span>
          </button>

          {canColor ? (
            <button
              type="button"
              disabled={unavailable || !light.isOn}
              aria-label={`Color for ${name}`}
              onClick={() => setOpen(true)}
              className={cn(
                'size-8 shrink-0 rounded-full border border-border shadow-inner',
                (!light.isOn || unavailable) && 'opacity-40',
              )}
              style={{
                background:
                  light.isOn && light.rgbColor
                    ? rgbCss(light.rgbColor)
                    : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
              }}
            />
          ) : canDim ? (
            <button
              type="button"
              disabled={unavailable}
              aria-label={`Adjust ${name}`}
              onClick={() => setOpen(true)}
              className="rounded-xl px-2 py-1 text-[11px] font-medium text-ink-muted hover:bg-canvas/50 hover:text-ink"
            >
              Adjust
            </button>
          ) : null}
        </div>

        {showInlineDimmer ? (
          <div
            className="mt-3"
            onPointerDown={stopSliderPointer}
            onClick={(e) => e.stopPropagation()}
          >
            <Slider
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
        ) : null}
      </div>

      {canDim || canColor ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent title={name}>
            <div className="space-y-6 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-muted">Power</span>
                <Switch
                  checked={light.isOn}
                  disabled={unavailable}
                  onCheckedChange={() => void handleToggle()}
                />
              </div>

              {canDim ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted">Brightness</span>
                    <span className="tabular-nums text-ink">{brightnessPct}%</span>
                  </div>
                  <Slider
                    aria-label="Brightness"
                    min={1}
                    max={100}
                    step={1}
                    disabled={unavailable || !light.isOn}
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
              ) : null}

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
                    <span className="tabular-nums text-ink">
                      {light.colorTemp ?? '—'}K
                    </span>
                  </div>
                  <Slider
                    aria-label="Color temperature"
                    min={light.minColorTempKelvin}
                    max={light.maxColorTempKelvin}
                    step={50}
                    disabled={unavailable || !light.isOn}
                    value={
                      light.colorTemp ??
                      Math.round(
                        (light.minColorTempKelvin + light.maxColorTempKelvin) / 2,
                      )
                    }
                    onValueCommitted={(value) => {
                      const next = Array.isArray(value) ? value[0] : value
                      void light.setColorTemp(next).catch((e) =>
                        notify(
                          'Temp failed',
                          e instanceof Error ? e.message : 'Error',
                        ),
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
