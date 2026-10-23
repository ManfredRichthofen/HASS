import type { ReactNode } from 'react'
import { cn } from '#/lib/cn'

/**
 * Vertical rhythm for every route. It is also a size container, so page
 * layouts use container queries (`@2xl:` etc.) and adapt to the space they
 * actually get — beside the tablet sidebar or inside the rooms list-detail.
 */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('@container flex w-full flex-col gap-section', className)}>{children}</div>
  )
}
