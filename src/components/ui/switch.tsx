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
        'relative flex h-7 w-12 shrink-0 rounded-full p-0.5 transition',
        'bg-border data-checked:bg-accent',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:opacity-40',
        className,
      )}
      {...props}
    >
      <BaseSwitch.Thumb
        className={cn(
          'aspect-square h-full rounded-full bg-ink shadow transition',
          'data-checked:translate-x-5 data-unchecked:translate-x-0',
        )}
      />
    </BaseSwitch.Root>
  )
}
