import type { ReactNode } from 'react'
import { cn } from '#/lib/cn'

/** Consistent vertical rhythm for every route on phone + tablet. */
export function Page({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex w-full flex-col gap-5 md:gap-6', className)}>
      {children}
    </div>
  )
}
