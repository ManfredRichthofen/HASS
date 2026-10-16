import { Switch as BaseSwitch } from '@base-ui/react/switch'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/cn'

export function Switch({
  className,
  ...props
}: ComponentProps<typeof BaseSwitch.Root>) {
  return (
    <BaseSwitch.Root
      className={cn(
        'relative inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-xl',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:opacity-40',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-1.5 inset-y-2.5 rounded-full transition',
          'bg-border peer-data-checked:bg-accent',
          '[[data-checked]_&]:bg-accent',
        )}
      />
      <BaseSwitch.Thumb
        className={cn(
          'relative z-10 size-6 rounded-full bg-ink shadow transition duration-150',
          'data-checked:translate-x-3 data-unchecked:-translate-x-3',
        )}
      />
    </BaseSwitch.Root>
  )
}
