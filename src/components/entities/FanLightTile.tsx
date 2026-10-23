import { useFan, useLight } from 'hass-react'
import { Fan, Lightbulb, Wind } from 'lucide-react'
import { type PointerEvent, useEffect, useMemo, useState } from 'react'
import { Slider } from '#/components/ui/slider'
import { notify } from '#/components/ui/toast'
import { useOptimisticValue } from '#/hooks/useOptimisticValue'
import { useScrollSafePress } from '#/hooks/useScrollSafePress'
import { cn } from '#/lib/cn'
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
  const { value: lightOn, commit: commitLight } = useOptimisticValue(
    light.isOn && !light.isUnavailable,
  )
  const { value: fanOn, commit: commitFan } = useOptimisticValue(fan.isOn && !fan.isUnavailable)
  const canSpeed = fan.supportsSetSpeed
  const showFanControls = canSpeed && !fan.isUnavailable
  const showInline = showFanControls && fanOn
  const activePreset = useMemo(() => (canSpeed ? nearestPreset(speed) : null), [canSpeed, speed])
  const active = lightOn || fanOn

  useEffect(() => {
    setSpeed(Math.max(0, Math.round(fan.percentage) || 0))
  }, [fan.percentage, fan.isOn])

  const toggleLight = () => {
    commitLight(!lightOn, async () => {
      try {
        await light.toggle()
      } catch (e) {
        notify('Light failed', e instanceof Error ? e.message : 'Error')
        throw e
      }
    })
  }

  const toggleFan = () => {
    commitFan(!fanOn, async () => {
      try {
        await fan.toggle()
      } catch (e) {
        notify('Fan failed', e instanceof Error ? e.message : 'Error')
        throw e
      }
    })
  }

  const lightPress = useScrollSafePress(toggleLight)
  const fanPress = useScrollSafePress(toggleFan)

  const failSpeed = (e: unknown) => {
    notify('Fan speed failed', e instanceof Error ? e.message : 'Error')
  }

  const commitSpeed = (pct: number) => {
    if (pct <= 0) {
      commitFan(false, async () => {
        try {
          await fan.turnOff()
        } catch (e) {
          failSpeed(e)
          throw e
        }
      })
      return
    }
    if (!fanOn) {
      commitFan(true, async () => {
        try {
          await fan.turnOn({ percentage: pct })
        } catch (e) {
          failSpeed(e)
          throw e
        }
      })
      return
    }
    void fan.setPercentage(pct).catch(failSpeed)
  }

  function stopBubble(e: PointerEvent) {
    e.stopPropagation()
  }

  const fanStatus = fan.isUnavailable
    ? 'Unavailable'
    : fanOn
      ? canSpeed
        ? `${speed || activePreset?.value || 0}% · ${activePreset?.label ?? 'Custom'}`
        : 'On'
      : 'Off'

  return (
    <div
      className={cn(
        'relative flex min-w-0 flex-col overflow-hidden rounded-card border-ui p-4.5 transition-state',
        showInline || (!fanOn && showFanControls) ? 'min-h-[12.5rem]' : 'min-h-[8.5rem]',
        active
          ? 'bg-on shadow-on border-transparent brutal:border-ink'
          : 'border-border-subtle bg-surface shadow-card modern:border-transparent',
        unavailable && 'opacity-40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 pt-0.5">
          <p
            className={cn(
              'truncate text-[0.9375rem] font-semibold',
              active ? 'text-on-ink' : 'text-ink',
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              'mt-0.5 truncate text-xs',
              active ? 'text-on-ink-muted' : 'text-ink-muted',
            )}
          >
            Light {lightOn ? 'on' : 'off'} · Fan {fanStatus.toLowerCase()}
          </p>
        </div>
        <span
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-control',
            active ? 'bg-on-ink/10 text-on-ink' : 'bg-icon-well text-ink-muted',
          )}
        >
          <Fan
            className={cn('size-5', fanOn && 'animate-spin')}
            style={fanOn ? { animationDuration: spinDuration(speed || 40) } : undefined}
          />
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <m.button
          type="button"
          disabled={light.isUnavailable}
          {...lightPress}
          whileTap={tap.soft}
          transition={snappy}
          className={cn(
            'flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-control border px-2 text-xs font-semibold transition-ui',
            lightOn
              ? 'border-on-ink/30 bg-on-ink/10 text-on-ink'
              : active
                ? 'border-on-ink/25 text-on-ink-muted'
                : 'border-border-subtle bg-canvas/40 text-ink-muted',
          )}
        >
          <Lightbulb className="size-3.5 shrink-0" />
          <span className="truncate">Light</span>
        </m.button>

        <m.button
          type="button"
          disabled={fan.isUnavailable}
          {...fanPress}
          whileTap={tap.soft}
          transition={snappy}
          className={cn(
            'flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-control border px-2 text-xs font-semibold transition-ui',
            fanOn
              ? 'border-on-ink/30 bg-on-ink/10 text-on-ink'
              : active
                ? 'border-on-ink/25 text-on-ink-muted'
                : 'border-border-subtle bg-canvas/40 text-ink-muted',
          )}
        >
          <Fan className="size-3.5 shrink-0" />
          <span className="truncate">Fan</span>
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
            <div className="mt-3 min-w-0 space-y-2">
              <div className="flex min-w-0 gap-1.5">
                {speedPresets.map((preset) => {
                  const selected = fanOn && activePreset?.value === preset.value
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
                        'touch-target min-w-0 flex-1 rounded-control border px-1.5 text-xs font-semibold transition-ui',
                        selected
                          ? 'border-on-ink bg-on-ink text-on-from'
                          : fanOn
                            ? 'border-transparent bg-on-ink/10 text-on-ink-muted hover:text-on-ink'
                            : 'border-border-subtle bg-canvas/40 text-ink-muted hover:text-ink',
                      )}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
              {showInline ? (
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-on-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <Wind className="size-3.5" /> Speed
                    </span>
                    <span className="tabular-nums text-on-ink">{speed}%</span>
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
    </div>
  )
}
