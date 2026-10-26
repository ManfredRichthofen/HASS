import { Slider as BaseSlider } from '@base-ui/react/slider'
import type { ComponentProps } from 'react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '#/lib/cn'

type SliderRootProps = ComponentProps<typeof BaseSlider.Root>

function asNumber(value: number | readonly number[]) {
  return Array.isArray(value) ? value[0]! : value
}

/**
 * A chunky 44px bar you can drag anywhere along. Controlled sliders keep a
 * local value while dragging so the fill moves immediately; the HA value is
 * applied again after commit.
 */
export function Slider({
  className,
  value,
  defaultValue,
  onValueChange,
  onValueCommitted,
  'aria-label': ariaLabel = 'Value',
  tone = 'accent',
  onCard = false,
  size = 'md',
  ...props
}: SliderRootProps & {
  'aria-label'?: string
  /** `light` fills with the lit gradient (brightness, colour temperature). */
  tone?: 'accent' | 'light'
  /** For use on a lit (bg-on) surface. */
  onCard?: boolean
  /** `thin` is a hairline track with a dot, for quiet places like the music player. */
  size?: 'md' | 'thin'
}) {
  const thin = size === 'thin'
  const controlled = value !== undefined
  const [local, setLocal] = useState(() =>
    controlled ? asNumber(value) : asNumber(defaultValue ?? 0),
  )
  const dragging = useRef(false)

  useEffect(() => {
    if (!controlled || dragging.current) return
    setLocal(asNumber(value))
  }, [controlled, value])

  return (
    <BaseSlider.Root
      className={cn('relative w-full min-w-0 touch-none select-none', className)}
      {...props}
      value={controlled ? local : undefined}
      defaultValue={controlled ? undefined : defaultValue}
      onValueChange={(next, eventDetails) => {
        dragging.current = true
        setLocal(asNumber(next))
        onValueChange?.(next as never, eventDetails)
      }}
      onValueCommitted={(next, eventDetails) => {
        const resolved = asNumber(next)
        setLocal(resolved)
        dragging.current = false
        onValueCommitted?.(next as never, eventDetails)
      }}
    >
      {thin ? (
        <BaseSlider.Control className="flex w-full min-w-0 cursor-pointer touch-none py-4">
          <BaseSlider.Track
            className={cn(
              'relative h-1.5 w-full min-w-0 grow rounded-pill bg-surface-hover',
              'glass:bg-ink/10',
              'data-disabled:opacity-40',
            )}
          >
            <BaseSlider.Indicator className="absolute h-full rounded-pill bg-ink transition-none" />
            <BaseSlider.Thumb
              aria-label={ariaLabel}
              className={cn(
                'size-4 rounded-pill bg-ink outline-none select-none',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              )}
            />
          </BaseSlider.Track>
        </BaseSlider.Control>
      ) : (
        <BaseSlider.Control className="flex w-full min-w-0 cursor-pointer touch-none">
          <BaseSlider.Track
            className={cn(
              'relative h-11 w-full min-w-0 grow overflow-hidden rounded-control border-ui border-transparent',
              onCard ? 'bg-on-ink/12' : 'bg-surface-hover',
              'glass:bg-ink/8',
              'data-disabled:opacity-40',
            )}
          >
            <BaseSlider.Indicator
              className={cn(
                'absolute h-full transition-none',
                onCard
                  ? 'bg-on-ink-muted/80'
                  : tone === 'light'
                    ? 'bg-gradient-to-r from-on-to to-on-from'
                    : 'bg-accent',
                'glass:bg-none glass:bg-raised glass:shadow-card',
              )}
            />
            <BaseSlider.Thumb
              aria-label={ariaLabel}
              className={cn(
                'h-full w-6 outline-none select-none',
                'after:absolute after:top-1/2 after:left-1/2 after:-mt-[9px] after:h-[18px] after:w-1 after:-translate-x-[10px] after:rounded-full after:content-[""]',
                onCard || tone === 'light' ? 'after:bg-on-ink/60' : 'after:bg-on-accent/60',
                'glass:after:bg-on-raised/70',
                'focus-visible:after:bg-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
              )}
            />
          </BaseSlider.Track>
        </BaseSlider.Control>
      )}
    </BaseSlider.Root>
  )
}

/** Slider with its label and live value above it. */
export function LabeledSlider({
  label,
  format = (v) => String(v),
  ...props
}: ComponentProps<typeof Slider> & { label: string; format?: (value: number) => string }) {
  const initial = asNumber(props.value ?? props.defaultValue ?? 0)
  const [shown, setShown] = useState(initial)
  useEffect(() => setShown(initial), [initial])
  return (
    <div className="grid gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-label">{label}</span>
        <span className="text-display text-lg tabular-nums">{format(shown)}</span>
      </div>
      <Slider
        aria-label={label}
        {...props}
        onValueChange={(v, d) => {
          setShown(asNumber(v))
          props.onValueChange?.(v as never, d)
        }}
      />
    </div>
  )
}
