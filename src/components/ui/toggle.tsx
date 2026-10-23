import { Toggle as BaseToggle } from '@base-ui/react/toggle'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/cn'

/** A single pressable pill; pressed = inverted. Prefer `Segmented` for groups. */
export function Toggle({ className, ...props }: ComponentProps<typeof BaseToggle>) {
  return (
    <BaseToggle
      className={cn(
        'press inline-flex h-11 items-center justify-center rounded-pill border-ui border-border px-4 text-sm font-semibold text-ink-muted',
        'hover:bg-surface-hover hover:text-ink',
        'data-pressed:border-accent data-pressed:bg-accent data-pressed:text-on-accent',
        'brutal:bg-surface brutal:font-label brutal:text-xs brutal:font-medium brutal:uppercase',
        className,
      )}
      {...props}
    />
  )
}
