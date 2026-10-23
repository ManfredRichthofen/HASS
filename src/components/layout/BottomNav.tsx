import { Link, useRouterState } from '@tanstack/react-router'
import { isNavActive, navItems } from '#/components/layout/navItems'
import { cn } from '#/lib/cn'
import { indicator, LayoutGroup, m } from '#/lib/motion'

/**
 * Phone navigation; tablets use SideNav.
 * Walnut: a bar with a short indicator along the top edge.
 * Modern: a floating pill bar; the active item expands to show its label.
 * Brutalist: ruled cells, the active one inverted.
 */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav
      aria-label="Main"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 md:hidden',
        'border-t border-border-subtle bg-canvas-elevated pt-1.5 pb-[max(1rem,env(safe-area-inset-bottom))]',
        'modern:inset-x-3.5 modern:bottom-[max(0.875rem,env(safe-area-inset-bottom))] modern:rounded-pill modern:border-0 modern:bg-surface/88 modern:p-1.5 modern:shadow-[0_10px_30px_-12px_#14141340] modern:backdrop-blur-xl',
        'glass:inset-x-3.5 glass:bottom-[max(0.875rem,env(safe-area-inset-bottom))] glass:rounded-pill glass:border-ui glass:border-border-subtle glass:bg-canvas-elevated glass:p-1.5 glass:shadow-sheet',
        'brutal:border-t-2 brutal:border-ink brutal:pt-0',
      )}
    >
      <LayoutGroup id="bottom-nav">
        <div className="flex w-full items-stretch justify-between px-2 modern:px-0 brutal:px-0 glass:px-0">
          {navItems.map(({ to, label, icon: Icon, match }) => {
            const active = isNavActive(pathname, to, match)
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 font-label text-xs font-medium transition-ui',
                  active ? 'font-semibold text-ink' : 'text-ink-faint hover:text-ink-muted',
                  'modern:min-h-12 modern:flex-none modern:flex-row modern:gap-2 modern:rounded-pill modern:px-3.5 modern:text-sm',
                  active && 'modern:bg-accent modern:text-on-accent',
                  'glass:min-h-12 glass:flex-none glass:flex-row glass:gap-2 glass:rounded-pill glass:px-3.5 glass:text-sm',
                  active && 'glass:bg-accent glass:text-on-accent',
                  'brutal:uppercase brutal:tracking-[0.04em] brutal:not-first:border-l-2 brutal:not-first:border-ink',
                  active && 'brutal:bg-ink brutal:text-surface',
                )}
              >
                {active ? (
                  <m.span
                    layoutId="bottom-nav-indicator"
                    transition={indicator}
                    className="absolute -top-1.5 h-[3px] w-6 rounded-b-[3px] bg-ink modern:hidden brutal:hidden glass:hidden"
                  />
                ) : null}
                <Icon className="size-[22px] shrink-0" />
                <span className={cn('truncate', !active && 'modern:sr-only glass:sr-only')}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </LayoutGroup>
    </nav>
  )
}
