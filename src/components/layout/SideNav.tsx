import { Link, useRouterState } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import { isNavActive, navItems } from '#/components/layout/navItems'
import { cn } from '#/lib/cn'
import { indicator, LayoutGroup, m } from '#/lib/motion'

const linkBase =
  'relative flex min-h-14 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition-ui max-lg:flex-col max-lg:justify-center max-lg:gap-1 max-lg:px-1 max-lg:text-[11px]'

/** Tablet / desktop navigation: icon rail at md, labelled sidebar at lg. */
export function SideNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav
      aria-label="Main"
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden w-[5.5rem] flex-col border-r border-border-subtle bg-canvas-elevated md:flex lg:w-60',
        'pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]',
      )}
    >
      <p className="mb-4 hidden px-6 font-display text-lg font-bold tracking-tight text-ink lg:block">
        Home
      </p>
      <LayoutGroup id="side-nav">
        <div className="flex flex-1 flex-col gap-1 px-2 lg:px-3">
          {navItems.map(({ to, label, icon: Icon, match }) => {
            const active = isNavActive(pathname, to, match)
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  linkBase,
                  active ? 'text-accent-strong' : 'text-ink-muted hover:text-ink',
                )}
              >
                {active ? (
                  <m.span
                    layoutId="side-nav-indicator"
                    className="absolute inset-0 rounded-2xl bg-accent-soft"
                    transition={indicator}
                  />
                ) : null}
                <Icon className="relative size-5 shrink-0" strokeWidth={active ? 2.4 : 2} />
                <span className="relative truncate">{label}</span>
              </Link>
            )
          })}
        </div>
      </LayoutGroup>
      <div className="px-2 lg:px-3">
        <Link
          to="/settings"
          className={cn(
            linkBase,
            isNavActive(pathname, '/settings', 'prefix')
              ? 'bg-accent-soft text-accent-strong'
              : 'text-ink-muted hover:text-ink',
          )}
        >
          <Settings className="size-5 shrink-0" />
          <span className="truncate">Settings</span>
        </Link>
      </div>
    </nav>
  )
}
