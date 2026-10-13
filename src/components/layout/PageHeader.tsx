import type { ReactNode } from 'react'
import { cn } from '#/lib/cn'

export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        'mb-5 flex items-start justify-between gap-3 pt-[max(0.25rem,env(safe-area-inset-top))]',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <div className="mt-1 text-sm text-ink-muted">{subtitle}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}
