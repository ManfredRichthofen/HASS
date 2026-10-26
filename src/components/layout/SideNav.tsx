import { Link, useRouterState } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import { isNavActive, navItems } from '#/components/layout/navItems'
import { primaryAreas } from '#/config/dashboard'
import { cn } from '#/lib/cn'
import { indicator, LayoutGroup, m, snappy, tap } from '#/lib/motion'

const counts: Record<string, number> = { '/rooms': primaryAreas.length }

const linkContent = cn(
  'relative z-[1] flex min-h-12 items-center gap-3.5 px-3 text-[0.9375rem] font-semibold',
  'max-lg:min-h-15 max-lg:flex-col max-lg:justify-center max-lg:gap-1 max-lg:px-1 max-lg:text-xs',
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
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative block rounded-control transition-[color,background-color] duration-normal ease-out',
        active ? 'text-ink' : 'text-ink-muted hover:bg-accent-soft/60 hover:text-ink',
      )}
    >
      {active ? (
        <m.span
          layoutId="side-nav-indicator"
          transition={indicator}
          aria-hidden
          className="absolute inset-0 rounded-control bg-accent-soft modern:bg-surface modern:shadow-[0_1px_2px_#1414130f] glass:bg-surface glass:shadow-card"
        />
      ) : null}
      {/* Press scale lives here, not on the indicator's parent, so the
          indicator never measures a mid-press (scaled) box. */}
      <m.span whileTap={tap.medium} transition={snappy} className={linkContent}>
        <Icon className="size-[22px] shrink-0" />
        <span className="truncate">{label}</span>
        {count != null ? (
          <span
            className={cn(
              'ml-auto hidden text-xs tabular-nums lg:block',
              active ? 'text-ink-muted' : 'text-ink-faint',
            )}
          >
            {count}
          </span>
        ) : null}
      </m.span>
    </Link>
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
        'modern:border-r-0 modern:bg-transparent glass:border-r glass:border-border-subtle glass:bg-canvas',
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
