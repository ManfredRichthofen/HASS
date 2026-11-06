import { useFan, useSensor } from 'hass-react'
import { ArrowDownUp, Fan, SlidersHorizontal, Wind } from 'lucide-react'
import { type PointerEvent, useEffect, useMemo, useState } from 'react'
import { Drawer, DrawerContent } from '#/components/ui/drawer'
import { Slider } from '#/components/ui/slider'
import { Switch } from '#/components/ui/switch'
import { notify } from '#/components/ui/toast'
import { Toggle } from '#/components/ui/toggle'
import { useOptimisticValue } from '#/hooks/useOptimisticValue'
import { useScrollSafePress } from '#/hooks/useScrollSafePress'
import { cn } from '#/lib/cn'
import { entityName } from '#/lib/entityName'
import { AnimatePresence, expandCollapse, m, snappy, tap } from '#/lib/motion'

type SpeedPreset = { label: string; value: number }

/** Low / Med / High that land on speeds the fan can actually run at (its percentage step). */
function presetsFor(step: number): SpeedPreset[] {
  if (step < 10) {
    return [
      { label: 'Low', value: 33 },
      { label: 'Med', value: 66 },
      { label: 'High', value: 100 },
    ]
  }
  const mid = Math.round(50 / step) * step || step
  return [
    { label: 'Low', value: step },
    { label: 'Med', value: mid },
    { label: 'High', value: 100 },
  ]
}

/** The preset a speed matches, or null: 50% is not "Med" just because Med is closest. */
function matchingPreset(presets: SpeedPreset[], pct: number, step: number) {
  const tolerance = Math.max(5, step / 2 - 1)
  return presets.find((preset) => Math.abs(preset.value - pct) <= tolerance) ?? null
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

type Reading = { id: string; label: string; suffix?: string }

function LabelledReading({ reading }: { reading: Reading }) {
  const sensor = useSensor(reading.id)
  if (sensor.isUnavailable || sensor.numericValue == null) return null
  return (
    <span>
      {reading.label} {Math.round(sensor.numericValue)}
      {reading.suffix ?? ''}
    </span>
  )
}

function SensorHint({
  tempId,
  humidityId,
  readings,
  onCard,
}: {
  tempId?: string
  humidityId?: string
  readings?: Reading[]
  onCard?: boolean
}) {
  if (!tempId && !humidityId && !readings?.length) return null

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
      {readings?.map((reading, i) => (
        <span key={reading.id} className="inline-flex gap-x-1.5">
          {i > 0 || tempId || humidityId ? <span aria-hidden>·</span> : null}
          <LabelledReading reading={reading} />
        </span>
      ))}
    </span>
  )
}

export function FanTile({
  entityId,
  label,
  tempId,
  humidityId,
  readings,
}: {
  entityId: string
  label?: string
  /** Same-device climate sensors shown on this card. */
  tempId?: string
  humidityId?: string
  readings?: Reading[]
}) {
  const fan = useFan(entityId)
  const [open, setOpen] = useState(false)
  const [speed, setSpeed] = useState(Math.max(0, Math.round(fan.percentage) || 0))
  const name = label ?? entityName(entityId, fan.attributes.friendly_name)
  const unavailable = fan.isUnavailable
  const { value: isOn, commit: commitOn } = useOptimisticValue(fan.isOn && !unavailable)
  const canSpeed = fan.supportsSetSpeed
  const presets = fan.availablePresetModes.filter(Boolean)
  const showInline = canSpeed && isOn && !unavailable
  const hasSensors = Boolean(tempId || humidityId || readings?.length)
  const step = fan.attributes.percentage_step ?? 1
  const speedPresets = useMemo(() => presetsFor(step), [step])
  const activePreset = useMemo(
    () => (canSpeed ? matchingPreset(speedPresets, speed, step) : null),
    [canSpeed, speed, speedPresets, step],
  )
  // Auto / Sleep modes run the fan themselves and report no percentage at all.
  const autoMode =
    isOn &&
    !unavailable &&
    Boolean(fan.presetMode) &&
    (fan.attributes as { percentage?: number | null }).percentage == null

  useEffect(() => {
    setSpeed(Math.max(0, Math.round(fan.percentage) || 0))
  }, [fan.percentage, fan.isOn])

  const handleToggle = () => {
    commitOn(!isOn, async () => {
      try {
        await fan.toggle()
      } catch (e) {
        notify('Fan failed', e instanceof Error ? e.message : 'Unknown error')
        throw e
      }
    })
  }

  const togglePress = useScrollSafePress(handleToggle)

  const failSpeed = (e: unknown) => {
    notify('Fan speed failed', e instanceof Error ? e.message : 'Error')
  }

  const commitSpeed = (pct: number) => {
    if (pct <= 0) {
      commitOn(false, async () => {
        try {
          await fan.turnOff()
        } catch (e) {
          failSpeed(e)
          throw e
        }
      })
      return
    }
    if (!isOn) {
      commitOn(true, async () => {
        try {
          await fan.turnOn({ percentage: pct })
        } catch (e) {
          failSpeed(e)
          throw e
        }
      })
      return
    }
    // Auto and Sleep own the speed: switch to Manual first so the new speed sticks.
    const manual = autoMode ? presets.find((mode) => /^manual$/i.test(mode)) : undefined
    void (async () => {
      try {
        if (manual) await fan.setPresetMode(manual)
        await fan.setPercentage(pct)
      } catch (e) {
        failSpeed(e)
      }
    })()
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
    : isOn
      ? autoMode
        ? String(fan.presetMode)
        : canSpeed
          ? activePreset
            ? `${speed}% · ${activePreset.label}`
            : `${speed}%`
          : fan.presetMode || 'On'
      : 'Off'

  return (
    <>
      <div
        className={cn(
          'relative flex min-w-0 flex-col overflow-hidden rounded-card border-ui p-4.5 transition-state',
          showInline ? 'min-h-[11.5rem]' : 'min-h-[7.5rem]',
          isOn
            ? 'bg-on shadow-on border-transparent'
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
                isOn ? 'bg-on-ink/10 text-on-ink' : 'bg-icon-well text-ink-muted',
              )}
            >
              <Fan
                className={cn('size-5', isOn && 'animate-spin motion-reduce:animate-none')}
                style={isOn ? { animationDuration: spinDuration(speed || 40) } : undefined}
              />
            </span>
            <span className="min-w-0 pt-1">
              <span
                className={cn(
                  'line-clamp-2 block text-[0.9375rem] font-semibold',
                  isOn ? 'text-on-ink' : 'text-ink',
                )}
              >
                {name}
              </span>
              <span
                className={cn(
                  'mt-0.5 block truncate text-xs',
                  isOn ? 'text-on-ink-muted' : 'text-ink-muted',
                )}
              >
                {status}
              </span>
              {hasSensors ? (
                <SensorHint
                  tempId={tempId}
                  humidityId={humidityId}
                  readings={readings}
                  onCard={isOn}
                />
              ) : null}
            </span>
          </m.button>

          <button
            type="button"
            disabled={unavailable}
            aria-label={`Fan controls for ${name}`}
            onClick={() => setOpen(true)}
            className="grid size-11 shrink-0 place-items-center rounded-control text-ink-muted transition-ui hover:bg-surface-hover hover:text-ink"
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
                  <div className="flex items-center justify-between text-[0.8125rem] text-on-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <Wind className="size-3.5" /> Speed
                    </span>
                    <span className="tabular-nums text-on-ink">
                      {autoMode ? 'Automatic' : `${speed}%`}
                    </span>
                  </div>
                  {autoMode ? (
                    <p className="text-xs text-on-ink-muted">
                      {String(fan.presetMode)} sets the speed. Pick one above to take over.
                    </p>
                  ) : (
                  <Slider
                    onCard
                    aria-label={`${name} speed`}
                    min={0}
                    max={100}
                    step={step}
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
                  )}
                </div>
              </div>
            </m.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {!isOn && !unavailable && canSpeed ? (
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
                aria-label={`${name} power`}
                checked={isOn}
                disabled={unavailable}
                onCheckedChange={handleToggle}
              />
            </div>

            {canSpeed ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-muted">Speed</span>
                  <span className="tabular-nums text-ink">
                    {autoMode ? `Automatic (${String(fan.presetMode)})` : `${speed}%`}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {speedPresets.map((preset) => (
                    <Toggle
                      key={preset.label}
                      pressed={activePreset?.value === preset.value && isOn}
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
                {autoMode ? null : (
                <Slider
                  aria-label="Fan speed"
                  min={0}
                  max={100}
                  step={step}
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
                )}
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
                      aria-label="Oscillate"
                      checked={Boolean(fan.isOscillating)}
                      disabled={unavailable || !isOn}
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
                    disabled={unavailable || !isOn}
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
