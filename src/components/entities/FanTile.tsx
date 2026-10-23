import { useFan, useSensor } from 'hass-react'
import { ArrowDownUp, Fan, SlidersHorizontal, Wind } from 'lucide-react'
import { type PointerEvent, useEffect, useMemo, useState } from 'react'
import { Drawer, DrawerContent } from '#/components/ui/drawer'
import { Slider } from '#/components/ui/slider'
import { Switch } from '#/components/ui/switch'
import { notify } from '#/components/ui/toast'
import { Toggle } from '#/components/ui/toggle'
import { useScrollSafePress } from '#/hooks/useScrollSafePress'
import { cn } from '#/lib/cn'
import { entityName } from '#/lib/entityName'
import { AnimatePresence, expandCollapse, m, snappy, tap } from '#/lib/motion'

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
  return `${3.6 - (clamped / 100) * 2.8}s`
}

function SensorReading({ entityId, kind }: { entityId: string; kind: 'temp' | 'humidity' }) {
  const sensor = useSensor(entityId)
  if (sensor.isUnavailable || sensor.numericValue == null) return null
  const value =
    kind === 'temp'
      ? `${Math.round(sensor.numericValue * 10) / 10}°`
      : `${Math.round(sensor.numericValue)}%`
  return <span>{value}</span>
}

function SensorHint({
  tempId,
  humidityId,
  onCard,
}: {
  tempId?: string
  humidityId?: string
  onCard?: boolean
}) {
  if (!tempId && !humidityId) return null

  return (
    <span
      className={cn(
        'mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs',
        onCard ? 'text-on-ink/70' : 'text-ink-muted',
      )}
    >
      {tempId ? <SensorReading entityId={tempId} kind="temp" /> : null}
      {tempId && humidityId ? <span aria-hidden>·</span> : null}
      {humidityId ? <SensorReading entityId={humidityId} kind="humidity" /> : null}
    </span>
  )
}

export function FanTile({
  entityId,
  label,
  tempId,
  humidityId,
}: {
  entityId: string
  label?: string
  /** Same-device climate sensors shown on this card. */
  tempId?: string
  humidityId?: string
  compact?: boolean
}) {
  const fan = useFan(entityId)
  const [open, setOpen] = useState(false)
  const [speed, setSpeed] = useState(Math.max(0, Math.round(fan.percentage) || 0))
  const name = label ?? entityName(entityId, fan.attributes.friendly_name)
  const unavailable = fan.isUnavailable
  const canSpeed = fan.supportsSetSpeed
  const presets = fan.availablePresetModes.filter(Boolean)
  const showInline = canSpeed && fan.isOn && !unavailable
  const hasSensors = Boolean(tempId || humidityId)
  const activePreset = useMemo(() => (canSpeed ? nearestPreset(speed) : null), [canSpeed, speed])

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

  const togglePress = useScrollSafePress(() => void handleToggle())

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
          'relative flex min-w-0 flex-col overflow-hidden rounded-card border-ui p-4.5 transition-state',
          showInline ? 'min-h-[11.5rem]' : 'min-h-[7.5rem]',
          fan.isOn
            ? 'bg-on shadow-on border-transparent brutal:border-ink'
            : 'border-border-subtle bg-surface shadow-card modern:border-transparent',
          unavailable && 'opacity-40',
        )}
      >
        <div className="relative flex items-start justify-between gap-2">
          <m.button
            type="button"
            disabled={unavailable}
            {...togglePress}
            whileTap={tap.soft}
            transition={snappy}
            className="flex min-h-11 min-w-0 flex-1 items-start gap-3 text-left"
          >
            <span
              className={cn(
                'grid size-11 shrink-0 place-items-center rounded-control',
                fan.isOn ? 'bg-on-ink/10 text-on-ink' : 'bg-icon-well text-ink-muted',
              )}
            >
              <Fan
                className={cn('size-5', fan.isOn && 'animate-spin')}
                style={fan.isOn ? { animationDuration: spinDuration(speed || 40) } : undefined}
              />
            </span>
            <span className="min-w-0 pt-1">
              <span
                className={cn(
                  'line-clamp-2 block text-[0.9375rem] font-semibold',
                  fan.isOn ? 'text-on-ink' : 'text-ink',
                )}
              >
                {name}
              </span>
              <span
                className={cn(
                  'mt-0.5 block truncate text-xs',
                  fan.isOn ? 'text-on-ink-muted' : 'text-ink-muted',
                )}
              >
                {status}
              </span>
              {hasSensors ? (
                <SensorHint tempId={tempId} humidityId={humidityId} onCard={fan.isOn} />
              ) : null}
            </span>
          </m.button>

          <button
            type="button"
            disabled={unavailable}
            aria-label={`Fan controls for ${name}`}
            onClick={() => setOpen(true)}
            className="grid size-11 shrink-0 place-items-center rounded-control text-ink-muted transition-ui hover:bg-black/5 hover:text-ink"
          >
            <SlidersHorizontal className="size-4" />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {showInline ? (
            <m.div
              key="fan-controls"
              initial={expandCollapse.initial}
              animate={expandCollapse.animate}
              exit={expandCollapse.exit}
              className="relative overflow-hidden"
              onPointerDown={stopBubble}
            >
              <div className="mt-4 min-w-0 space-y-3">
                <div className="flex min-w-0 gap-1.5">
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
                          'touch-target min-w-0 flex-1 rounded-control border px-1.5 text-xs font-semibold transition-ui',
                          selected
                            ? 'border-on-ink bg-on-ink text-on-from'
                            : 'border-transparent bg-on-ink/10 text-on-ink-muted hover:text-on-ink',
                        )}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>

                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-on-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <Wind className="size-3.5" /> Speed
                    </span>
                    <span className="tabular-nums text-on-ink">{speed}%</span>
                  </div>
                  <Slider
                    onCard
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
            </m.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {!fan.isOn && !unavailable && canSpeed ? (
            <m.div
              key="fan-presets-off"
              initial={expandCollapse.initial}
              animate={expandCollapse.animate}
              exit={expandCollapse.exit}
              className="relative overflow-hidden"
              onPointerDown={stopBubble}
            >
              <div className="mt-4 flex min-w-0 gap-1.5">
                {speedPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setSpeed(preset.value)
                      void commitSpeed(preset.value)
                    }}
                    className="touch-target min-w-0 flex-1 rounded-control border border-border-subtle bg-canvas/40 px-1.5 text-xs font-semibold text-ink-muted transition-ui hover:border-info/30 hover:text-ink"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </m.div>
          ) : null}
        </AnimatePresence>
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
                  <div className="flex items-center justify-between rounded-card border border-border-subtle bg-canvas/40 px-3 py-2.5">
                    <span className="text-sm text-ink">Oscillate</span>
                    <Switch
                      checked={Boolean(fan.isOscillating)}
                      disabled={unavailable || !fan.isOn}
                      onCheckedChange={(checked) => {
                        void fan
                          .setOscillating(checked)
                          .catch((e) =>
                            notify('Oscillate failed', e instanceof Error ? e.message : 'Error'),
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
                      const next = fan.direction === 'reverse' ? 'forward' : 'reverse'
                      void fan
                        .setDirection(next)
                        .catch((e) =>
                          notify('Direction failed', e instanceof Error ? e.message : 'Error'),
                        )
                    }}
                    className="flex items-center justify-between rounded-card border border-border-subtle bg-canvas/40 px-3 py-2.5 text-left text-sm text-ink disabled:opacity-40"
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
