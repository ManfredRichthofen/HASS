import { Link, useRouterState } from '@tanstack/react-router'
import { isNavActive, navItems } from '#/components/layout/navItems'
import { cn } from '#/lib/cn'
import { indicator, LayoutGroup, m, snappy, tap } from '#/lib/motion'

/**
 * Phone navigation; tablets use SideNav.
 * A floating pill bar; the active chip slides between items and the items
 * resize with it (only the active one shows its label).
 */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav
      aria-label="Main"
      className={cn(
        'fixed inset-x-3.5 bottom-[var(--nav-offset)] z-40 rounded-pill p-1.5 md:hidden',
        'modern:bg-surface/88 modern:shadow-[0_10px_30px_-12px_#14141340] modern:backdrop-blur-xl',
        'glass:border-ui glass:border-border-subtle glass:bg-canvas-elevated glass:shadow-sheet',
      )}
    >
      <LayoutGroup id="bottom-nav">
        <div className="flex w-full items-stretch justify-between">
          {navItems.map(({ to, label, icon: Icon, match }) => {
            const active = isNavActive(pathname, to, match)
            return (
              <m.div
                key={to}
                layout
                transition={indicator}
                className="relative h-12 min-w-0"
              >
                <Link
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative block size-full rounded-pill transition-[color] duration-normal ease-out',
                    active ? 'text-on-accent' : 'text-ink-faint hover:text-ink-muted',
                  )}
                >
                  {/* Sliding active fill */}
                  {active ? (
                    <m.span
                      layoutId="bottom-nav-pill"
                      transition={indicator}
                      aria-hidden
                      className="absolute inset-0 rounded-pill bg-accent"
                    />
                  ) : null}

                  {/* Press scale lives here, not on the indicator's parent, so the
                      indicator never measures a mid-press (scaled) box. */}
                  <m.span
                    layout
                    whileTap={tap.medium}
                    transition={snappy}
                    className="relative z-[1] flex size-full min-w-0 items-center justify-center gap-2 px-3.5 font-label text-sm font-semibold"
                  >
                    <Icon className="size-[22px] shrink-0" />
                    <span className={active ? 'animate-label-in truncate' : 'sr-only'}>
                      {label}
                    </span>
                  </m.span>
                </Link>
              </m.div>
            )
          })}
        </div>
      </LayoutGroup>
    </nav>
  )
}
