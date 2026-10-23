import type { ReactNode } from 'react'
import { cn } from '#/lib/cn'

/**
 * Wide-card list: one column when narrow, two once there is room (container
 * query). A lone trailing card spans the full row so odd counts never leave a hole.
 */
export function CardGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="@container">
      <div
        className={cn(
          'grid grid-cols-1 gap-3 @2xl:grid-cols-2 [&>*]:min-w-0 @2xl:[&>*:last-child:nth-child(odd)]:col-span-2',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
