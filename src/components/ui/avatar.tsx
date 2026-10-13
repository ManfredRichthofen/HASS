import { Avatar as BaseAvatar } from '@base-ui/react/avatar'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/cn'

export function Avatar({
  className,
  initials,
  ...props
}: ComponentProps<typeof BaseAvatar.Root> & { initials?: string }) {
  return (
    <BaseAvatar.Root
      className={cn(
        'inline-flex size-10 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-sm font-semibold text-accent',
        className,
      )}
      {...props}
    >
      <BaseAvatar.Fallback className="flex size-full items-center justify-center">
        {initials ?? '?'}
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
  )
}
