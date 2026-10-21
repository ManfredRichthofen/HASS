import { Link, useRouterState } from '@tanstack/react-router'
import { isNavActive, navItems } from '#/components/layout/navItems'
import { cn } from '#/lib/cn'
import { indicator, LayoutGroup, m } from '#/lib/motion'

/** Phone navigation; tablets use SideNav. */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-canvas-elevated md:hidden',
        'pb-[max(1rem,env(safe-area-inset-bottom))] pt-2',
      )}
    >
      <LayoutGroup>
        <div className="mx-auto flex w-full items-stretch justify-between px-2 sm:px-5">
          {navItems.map(({ to, label, icon: Icon, match }) => {
            const active = isNavActive(pathname, to, match)

            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-ui',
                  active ? 'text-accent-strong' : 'text-ink-muted hover:text-ink',
                )}
              >
                <span className="relative grid h-[1.875rem] w-[3.25rem] place-items-center">
                  {active ? (
                    <m.span
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-full bg-accent-soft"
                      transition={indicator}
                    />
                  ) : null}
                  <Icon className="relative size-5" strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="truncate">{label}</span>
              </Link>
            )
          })}
        </div>
      </LayoutGroup>
    </nav>
  )
}
