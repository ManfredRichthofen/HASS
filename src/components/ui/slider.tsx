import { useEffect, useRef, useState } from 'react'
import { Slider as BaseSlider } from '@base-ui/react/slider'
import type { ComponentProps } from 'react'
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
  ...props
}: SliderRootProps & { 'aria-label'?: string }) {
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
        'relative flex w-full touch-none select-none items-center',
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
      <BaseSlider.Control className="flex w-full touch-none py-4">
        <BaseSlider.Track className="relative h-2 w-full grow rounded-full bg-border">
          <BaseSlider.Indicator className="absolute h-full rounded-full bg-accent transition-none" />
          <BaseSlider.Thumb
            aria-label={ariaLabel}
            className="size-6 rounded-full border-2 border-accent bg-ink shadow outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  )
}
