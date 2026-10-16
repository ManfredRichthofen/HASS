import { useEffect, useMemo, useState, type PointerEvent } from 'react'
import { useFan, useLight } from 'hass-react'
import { Fan, Lightbulb, Wind } from 'lucide-react'
import { cn } from '#/lib/cn'
import {
  AnimatePresence,
  expandCollapse,
  m,
  snappy,
  soft,
} from '#/lib/motion'
import { Slider } from '#/components/ui/slider'
import { Switch } from '#/components/ui/switch'
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
  return `${3.6 - (clamped / 100) * 2.8}s`
}

/** Ceiling fan + light kit — both entities on one card. */
export function FanLightTile({
  label,
  lightId,
  fanId,
}: {
  label: string
  lightId: string
  fanId: string
}) {
  const light = useLight(lightId)
  const fan = useFan(fanId)
  const [speed, setSpeed] = useState(Math.max(0, Math.round(fan.percentage) || 0))
  const unavailable = light.isUnavailable && fan.isUnavailable
  const canSpeed = fan.supportsSetSpeed
  const showFanControls = canSpeed && !fan.isUnavailable
  const showInline = showFanControls && fan.isOn
  const activePreset = useMemo(
    () => (canSpeed ? nearestPreset(speed) : null),
    [canSpeed, speed],
  )
  const active = light.isOn || fan.isOn

  useEffect(() => {
    setSpeed(Math.max(0, Math.round(fan.percentage) || 0))
  }, [fan.percentage, fan.isOn])

  async function toggleLight() {
    try {
      await light.toggle()
    } catch (e) {
      notify('Light failed', e instanceof Error ? e.message : 'Error')
    }
  }

  async function toggleFan() {
    try {
      await fan.toggle()
    } catch (e) {
      notify('Fan failed', e instanceof Error ? e.message : 'Error')
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

  function stopBubble(e: PointerEvent) {
    e.stopPropagation()
  }

  const fanStatus = fan.isUnavailable
    ? 'Unavailable'
    : fan.isOn
      ? canSpeed
        ? `${speed || activePreset?.value || 0}% · ${activePreset?.label ?? 'Custom'}`
        : 'On'
      : 'Off'

  return (
    <m.div
      layout
      transition={soft}
      className={cn(
        'relative flex flex-col overflow-hidden rounded-2xl border p-3.5',
        showInline || (!fan.isOn && showFanControls)
          ? 'min-h-[12.5rem]'
          : 'min-h-[8.5rem]',
        active ? 'bg-on border-transparent' : 'border-border-subtle bg-surface',
        unavailable && 'opacity-40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 pt-0.5">
          <p className="text-sm font-semibold tracking-tight text-ink">{label}</p>
          <p
            className={cn(
              'mt-0.5 text-xs',
              active ? 'text-white/80' : 'text-ink-muted',
            )}
          >
            Light {light.isOn ? 'on' : 'off'} · Fan {fanStatus.toLowerCase()}
          </p>
        </div>
        <span
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-xl',
            active ? 'bg-white/20 text-white' : 'bg-[#252e40] text-ink-muted',
          )}
        >
          <Fan
            className={cn('size-5', fan.isOn && 'animate-spin')}
            style={
              fan.isOn
                ? { animationDuration: spinDuration(speed || 40) }
                : undefined
            }
          />
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <m.button
          type="button"
          disabled={light.isUnavailable}
          onClick={() => void toggleLight()}
          whileTap={{ scale: 0.98 }}
          transition={snappy}
          className={cn(
            'flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs font-semibold transition',
            light.isOn
              ? 'border-white/40 bg-white/20 text-white'
              : 'border-border-subtle bg-canvas/40 text-ink-muted',
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <Lightbulb className="size-3.5" />
            Light
          </span>
          <span
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Switch
              checked={light.isOn}
              disabled={light.isUnavailable}
              onCheckedChange={() => void toggleLight()}
            />
          </span>
        </m.button>

        <m.button
          type="button"
          disabled={fan.isUnavailable}
          onClick={() => void toggleFan()}
          whileTap={{ scale: 0.98 }}
          transition={snappy}
          className={cn(
            'flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs font-semibold transition',
            fan.isOn
              ? 'border-white/40 bg-white/20 text-white'
              : 'border-border-subtle bg-canvas/40 text-ink-muted',
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <Fan className="size-3.5" />
            Fan
          </span>
          <span
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Switch
              checked={fan.isOn}
              disabled={fan.isUnavailable}
              onCheckedChange={() => void toggleFan()}
            />
          </span>
        </m.button>
      </div>

      <AnimatePresence initial={false}>
        {showFanControls ? (
          <m.div
            key="fan-speed"
            initial={expandCollapse.initial}
            animate={expandCollapse.animate}
            exit={expandCollapse.exit}
            className="overflow-hidden"
            onPointerDown={stopBubble}
          >
            <div className="mt-3 space-y-2">
              <div className="flex gap-1.5">
                {speedPresets.map((preset) => {
                  const selected =
                    fan.isOn && activePreset?.value === preset.value
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      disabled={fan.isUnavailable}
                      onClick={() => {
                        setSpeed(preset.value)
                        void commitSpeed(preset.value)
                      }}
                      className={cn(
                        'touch-target flex-1 rounded-xl border px-2 text-xs font-semibold transition',
                        selected
                          ? 'border-white/60 bg-white/25 text-white'
                          : fan.isOn
                            ? 'border-transparent bg-white/10 text-white/80 hover:text-white'
                            : 'border-border-subtle bg-canvas/40 text-ink-muted hover:text-ink',
                      )}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
              {showInline ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-white/80">
                    <span className="inline-flex items-center gap-1">
                      <Wind className="size-3.5" /> Speed
                    </span>
                    <span className="tabular-nums text-white">{speed}%</span>
                  </div>
                  <Slider
                    onCard
                    aria-label={`${label} fan speed`}
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
              ) : null}
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </m.div>
  )
}
