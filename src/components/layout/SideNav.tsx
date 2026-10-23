import { Link, useRouterState } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import { isNavActive, navItems } from '#/components/layout/navItems'
import { primaryAreas } from '#/config/dashboard'
import { cn } from '#/lib/cn'
import { indicator, LayoutGroup, m, snappy, tap } from '#/lib/motion'

const counts: Record<string, number> = { '/rooms': primaryAreas.length }

const linkBase = cn(
  'relative flex min-h-12 items-center gap-3.5 rounded-control px-3 text-[0.9375rem] font-medium transition-[color] duration-normal ease-out',
  'max-lg:min-h-15 max-lg:flex-col max-lg:justify-center max-lg:gap-1 max-lg:px-1 max-lg:text-xs',
  'brutal:font-label brutal:text-[0.8125rem] brutal:uppercase brutal:tracking-[0.03em] brutal:text-ink',
)

type NavTo = (typeof navItems)[number]['to'] | '/settings'

function NavLink({
  to,
  label,
  icon: Icon,
  match,
  pathname,
  count,
}: {
  to: NavTo
  label: string
  icon: typeof Settings
  match: 'exact' | 'prefix'
  pathname: string
  count?: number
}) {
  const active = isNavActive(pathname, to, match)

  return (
    <m.div whileTap={tap.soft} transition={snappy}>
      <Link
        to={to}
        aria-current={active ? 'page' : undefined}
        className={cn(
          linkBase,
          active ? 'font-semibold text-ink' : 'text-ink-muted hover:text-ink',
          active && 'brutal:text-surface',
        )}
      >
        {active ? (
          <m.span
            layoutId="side-nav-indicator"
            transition={indicator}
            aria-hidden
            className="absolute inset-0 rounded-control bg-accent-soft modern:bg-surface modern:shadow-[0_1px_2px_#1414130f] brutal:bg-ink glass:bg-surface glass:shadow-card"
          />
        ) : null}
        <Icon className="relative z-[1] size-[22px] shrink-0" />
        <span className="relative z-[1] truncate">{label}</span>
        {count != null ? (
          <span
            className={cn(
              'relative z-[1] ml-auto hidden text-xs tabular-nums lg:block',
              active ? 'text-ink-muted brutal:text-surface' : 'text-ink-faint',
            )}
          >
            {count}
          </span>
        ) : null}
      </Link>
    </m.div>
  )
}

/** Tablet navigation: icon rail at md, labelled sidebar with counts at lg. */
export function SideNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav
      aria-label="Main"
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden w-[5.5rem] flex-col border-r border-border-subtle bg-canvas-elevated md:flex lg:w-60',
        'pt-[max(1.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]',
        'modern:border-r-0 modern:bg-transparent brutal:border-r-2 glass:border-r glass:border-border-subtle glass:bg-canvas glass:backdrop-blur-2xl',
      )}
    >
      <p className="text-display mb-7 hidden px-6 text-2xl text-ink lg:block">Home</p>
      <LayoutGroup id="side-nav">
        <div className="flex flex-1 flex-col gap-1 px-2 lg:px-3.5">
          {navItems.map(({ to, label, icon, match }) => (
            <NavLink
              key={to}
              to={to}
              label={label}
              icon={icon}
              match={match}
              pathname={pathname}
              count={counts[to]}
            />
          ))}
        </div>
        <div className="px-2 lg:px-3.5">
          <NavLink
            to="/settings"
            label="Settings"
            icon={Settings}
            match="prefix"
            pathname={pathname}
          />
        </div>
      </LayoutGroup>
    </nav>
  )
}
