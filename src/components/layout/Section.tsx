import type { ReactNode } from 'react'
import { cn } from '#/lib/cn'

export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('min-w-0', className)}>
      {(title || action) && (
        <div className="mb-2.5 flex items-center justify-between gap-2 md:mb-3">
          {title ? (
            <h2 className="text-xs font-bold tracking-[0.08em] text-ink-faint uppercase">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
