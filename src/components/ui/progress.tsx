import { Progress as BaseProgress } from '@base-ui/react/progress'
import type { ComponentProps } from 'react'
import { cn } from '#/lib/cn'

export function Progress({ className, value, ...props }: ComponentProps<typeof BaseProgress.Root>) {
  return (
    <BaseProgress.Root className={cn('grid gap-1', className)} value={value} {...props}>
      <BaseProgress.Track className="h-1.5 overflow-hidden rounded-full bg-border">
        <BaseProgress.Indicator className="h-full bg-accent transition-[width] duration-slow" />
      </BaseProgress.Track>
    </BaseProgress.Root>
  )
}
