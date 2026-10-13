import { useEffect, useMemo, useState, type PointerEvent } from 'react'
import { useFan } from 'hass-react'
import { ArrowDownUp, Fan, Wind } from 'lucide-react'
import { entityName } from '#/lib/entityName'
import { cn } from '#/lib/cn'
import { Drawer, DrawerContent } from '#/components/ui/drawer'
import { Slider } from '#/components/ui/slider'
import { Switch } from '#/components/ui/switch'
import { Toggle } from '#/components/ui/toggle'
import { notify } from '#/components/ui/toast'

const speedPresets = [
  { label: 'Low', value: 33 },
  { label: 'Med', value: 66 },
  { label: 'High', value: 100 },
] as const

function nearestPreset(pct: number) {
  return speedPresets.reduce((best, preset) =>
    Math.abs(preset.value - pct) < Math.abs(best.value - pct) ? preset : best,
  )
}

function spinDuration(pct: number) {
  const clamped = Math.max(8, Math.min(100, pct || 8))
  // Faster spin at higher speeds (seconds per rotation)
  return `${3.6 - (clamped / 100) * 2.8}s`
}

export function FanTile({
  entityId,
  compact = false,
}: {
  entityId: string
  compact?: boolean
}) {
  const fan = useFan(entityId)
  const [open, setOpen] = useState(false)
  const [speed, setSpeed] = useState(Math.max(0, Math.round(fan.percentage) || 0))
  const name = entityName(entityId, fan.attributes.friendly_name)
  const unavailable = fan.isUnavailable
  const canSpeed = fan.supportsSetSpeed
  const presets = fan.availablePresetModes.filter(Boolean)
  const showInline = canSpeed && fan.isOn && !unavailable
  const activePreset = useMemo(
    () => (canSpeed ? nearestPreset(speed) : null),
    [canSpeed, speed],
  )

  useEffect(() => {
    setSpeed(Math.max(0, Math.round(fan.percentage) || 0))
  }, [fan.percentage, fan.isOn])

  async function handleToggle() {
    try {
      await fan.toggle()
    } catch (e) {
      notify('Fan failed', e instanceof Error ? e.message : 'Unknown error')
    }
  }

  async function commitSpeed(pct: number) {
    try {
      if (pct <= 0) {
        await fan.turnOff()
        return
      }
      if (!fan.isOn) {
        await fan.turnOn({ percentage: pct })
        return
      }
      await fan.setPercentage(pct)
    } catch (e) {
      notify('Fan speed failed', e instanceof Error ? e.message : 'Error')
    }
  }

  async function setPresetMode(preset: string) {
    try {
      if (!fan.isOn) await fan.turnOn({ preset_mode: preset })
      else await fan.setPresetMode(preset)
    } catch (e) {
      notify('Preset failed', e instanceof Error ? e.message : 'Error')
    }
  }

  function stopBubble(e: PointerEvent) {
    e.stopPropagation()
  }

  const status = unavailable
    ? 'Unavailable'
    : fan.isOn
      ? canSpeed
        ? `${speed || activePreset?.value || 0}% · ${activePreset?.label ?? 'Custom'}`
        : fan.presetMode || 'On'
      : 'Off'

  return (
    <>
      <div
        className={cn(
          'relative flex flex-col overflow-hidden rounded-[1.75rem] border transition',
          compact ? 'p-4' : 'p-4',
          showInline ? 'min-h-[11.5rem]' : 'min-h-[8.25rem]',
          fan.isOn
            ? 'border-info/40 bg-gradient-to-br from-info/15 via-surface to-surface'
            : 'border-border-subtle bg-surface',
          unavailable && 'opacity-40',
        )}
      >
        {!compact && fan.isOn ? (
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-8 size-28 rounded-full border border-info/20"
          />
        ) : null}

        <div className="relative flex items-start justify-between gap-3">
          <button
            type="button"
            disabled={unavailable}
            onClick={() => void handleToggle()}
            className="flex min-w-0 flex-1 items-start gap-3 text-left active:scale-[0.98]"
          >
            <span
              className={cn(
                'grid size-12 shrink-0 place-items-center rounded-2xl',
                fan.isOn ? 'bg-info/20 text-info' : 'bg-canvas text-ink-muted',
              )}
            >
              <Fan
                className={cn('size-6', fan.isOn && 'animate-spin')}
                style={
                  fan.isOn
                    ? { animationDuration: spinDuration(speed || 40) }
                    : undefined
                }
              />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block font-display text-base font-semibold tracking-tight text-ink">
                {name}
              </span>
              <span className="mt-0.5 block text-xs text-ink-muted">{status}</span>
            </span>
          </button>

          <button
            type="button"
            disabled={unavailable}
            aria-label={`Fan controls for ${name}`}
            onClick={() => setOpen(true)}
            className="rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-ink-muted hover:bg-canvas/60 hover:text-ink"
          >
            Controls
          </button>
        </div>

        {showInline ? (
          <div className="relative mt-4 space-y-3" onPointerDown={stopBubble}>
            <div className="flex gap-1.5">
              {speedPresets.map((preset) => {
                const selected = activePreset?.value === preset.value
                return (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={unavailable}
                    onClick={() => {
                      setSpeed(preset.value)
                      void commitSpeed(preset.value)
                    }}
                    className={cn(
                      'flex-1 rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition',
                      selected
                        ? 'border-info/40 bg-info/20 text-info'
                        : 'border-border-subtle bg-canvas/50 text-ink-muted hover:text-ink',
                    )}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <Wind className="size-3.5" /> Speed
                </span>
                <span className="tabular-nums text-ink">{speed}%</span>
              </div>
              <Slider
                aria-label={`${name} speed`}
                min={0}
                max={100}
                step={fan.attributes.percentage_step ?? 1}
                value={speed}
                onValueChange={(value) => {
                  setSpeed(Array.isArray(value) ? value[0] : value)
                }}
                onValueCommitted={(value) => {
                  const next = Array.isArray(value) ? value[0] : value
                  setSpeed(next)
                  void commitSpeed(next)
                }}
              />
            </div>
          </div>
        ) : null}

        {!fan.isOn && !unavailable && canSpeed ? (
          <div className="relative mt-4 flex gap-1.5" onPointerDown={stopBubble}>
            {speedPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setSpeed(preset.value)
                  void commitSpeed(preset.value)
                }}
                className="flex-1 rounded-xl border border-border-subtle bg-canvas/40 px-2 py-2 text-[11px] font-semibold text-ink-muted transition hover:border-info/30 hover:text-ink"
              >
                {preset.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent title={name} description="Fan controls">
          <div className="space-y-6 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">Power</span>
              <Switch
                checked={fan.isOn}
                disabled={unavailable}
                onCheckedChange={() => void handleToggle()}
              />
            </div>

            {canSpeed ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-muted">Speed</span>
                  <span className="tabular-nums text-ink">{speed}%</span>
                </div>
                <div className="flex gap-1.5">
                  {speedPresets.map((preset) => (
                    <Toggle
                      key={preset.label}
                      pressed={activePreset?.value === preset.value && fan.isOn}
                      disabled={unavailable}
                      onPressedChange={() => {
                        setSpeed(preset.value)
                        void commitSpeed(preset.value)
                      }}
                      className="flex-1"
                    >
                      {preset.label}
                    </Toggle>
                  ))}
                </div>
                <Slider
                  aria-label="Fan speed"
                  min={0}
                  max={100}
                  step={fan.attributes.percentage_step ?? 1}
                  disabled={unavailable}
                  value={speed}
                  onValueChange={(value) => {
                    setSpeed(Array.isArray(value) ? value[0] : value)
                  }}
                  onValueCommitted={(value) => {
                    const next = Array.isArray(value) ? value[0] : value
                    setSpeed(next)
                    void commitSpeed(next)
                  }}
                />
              </div>
            ) : null}

            {presets.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-ink-muted">Modes</p>
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <Toggle
                      key={preset}
                      pressed={fan.presetMode === preset}
                      disabled={unavailable}
                      onPressedChange={() => void setPresetMode(preset)}
                      className="capitalize"
                    >
                      {preset}
                    </Toggle>
                  ))}
                </div>
              </div>
            ) : null}

            {(fan.supportsOscillate || fan.supportsDirection) && (
              <div className="grid gap-2">
                {fan.supportsOscillate ? (
                  <div className="flex items-center justify-between rounded-2xl border border-border-subtle bg-canvas/40 px-3 py-2.5">
                    <span className="text-sm text-ink">Oscillate</span>
                    <Switch
                      checked={Boolean(fan.isOscillating)}
                      disabled={unavailable || !fan.isOn}
                      onCheckedChange={(checked) => {
                        void fan.setOscillating(checked).catch((e) =>
                          notify(
                            'Oscillate failed',
                            e instanceof Error ? e.message : 'Error',
                          ),
                        )
                      }}
                    />
                  </div>
                ) : null}
                {fan.supportsDirection ? (
                  <button
                    type="button"
                    disabled={unavailable || !fan.isOn}
                    onClick={() => {
                      const next =
                        fan.direction === 'reverse' ? 'forward' : 'reverse'
                      void fan.setDirection(next).catch((e) =>
                        notify(
                          'Direction failed',
                          e instanceof Error ? e.message : 'Error',
                        ),
                      )
                    }}
                    className="flex items-center justify-between rounded-2xl border border-border-subtle bg-canvas/40 px-3 py-2.5 text-left text-sm text-ink disabled:opacity-40"
                  >
                    <span>Direction</span>
                    <span className="inline-flex items-center gap-1.5 capitalize text-ink-muted">
                      <ArrowDownUp className="size-3.5" />
                      {fan.direction ?? 'forward'}
                    </span>
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
