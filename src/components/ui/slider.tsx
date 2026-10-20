import { Slider as BaseSlider } from '@base-ui/react/slider'
import type { ComponentProps } from 'react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '#/lib/cn'

type SliderRootProps = ComponentProps<typeof BaseSlider.Root>

function asNumber(value: number | readonly number[]) {
  return Array.isArray(value) ? value[0]! : value
}

/**
 * Controlled sliders keep a local value while dragging so the thumb/fill
 * move immediately; HA (or parent) state is applied again after commit.
 */
export function Slider({
  className,
  value,
  defaultValue,
  onValueChange,
  onValueCommitted,
  'aria-label': ariaLabel = 'Value',
  onCard = false,
  ...props
}: SliderRootProps & {
  'aria-label'?: string
  /** Render for use on a filled indigo ("on") card. */
  onCard?: boolean
}) {
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
      className={cn(
        'relative flex w-full min-w-0 max-w-full touch-none select-none items-center',
        className,
      )}
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
      {/* px-3 = half of thumb (size-6) so ends stay inside the card */}
      <BaseSlider.Control className="flex w-full min-w-0 touch-none px-3 py-3">
        <BaseSlider.Track
          className={cn(
            'relative h-2 w-full min-w-0 grow rounded-full',
            onCard ? 'bg-white/25' : 'bg-border',
          )}
        >
          <BaseSlider.Indicator
            className={cn(
              'absolute h-full rounded-full transition-none',
              onCard ? 'bg-white' : 'bg-accent',
            )}
          />
          <BaseSlider.Thumb
            aria-label={ariaLabel}
            className={cn(
              'size-6 shrink-0 rounded-full border-2 bg-ink shadow outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              onCard ? 'border-white' : 'border-accent',
            )}
          />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  )
}
