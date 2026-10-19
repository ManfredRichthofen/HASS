import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '#/lib/cn'

export function PageHeader({
  title,
  subtitle,
  action,
  backTo,
  backLabel = 'Back',
  className,
}: {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  backTo?: '/rooms' | '/' | '/climate' | '/media' | '/security' | '/settings'
  backLabel?: string
  className?: string
}) {
  return (
    <header className={cn('pt-[max(0.25rem,env(safe-area-inset-top))]', className)}>
      {backTo ? (
        <Link
          to={backTo}
          className="mb-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink-muted transition hover:text-accent-strong"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem] md:text-3xl">
            {title}
          </h1>
          {subtitle ? <div className="mt-1 text-sm text-ink-muted">{subtitle}</div> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  )
}
