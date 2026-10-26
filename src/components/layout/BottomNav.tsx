import { Link, useRouterState } from '@tanstack/react-router'
import { isNavActive, navItems } from '#/components/layout/navItems'
import { cn } from '#/lib/cn'
import { indicator, LayoutGroup, m, snappy, tap } from '#/lib/motion'

/**
 * Phone navigation; tablets use SideNav.
 * Walnut: a bar with a short indicator along the top edge.
 * Modern / Glass: a floating pill bar; the active chip slides between items
 * and the items resize with it.
 */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav
      aria-label="Main"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 md:hidden',
        'border-t border-border-subtle bg-canvas-elevated pt-1.5 pb-[var(--nav-offset)]',
        'modern:inset-x-3.5 modern:bottom-[var(--nav-offset)] modern:rounded-pill modern:border-0 modern:bg-surface/88 modern:p-1.5 modern:shadow-[0_10px_30px_-12px_#14141340] modern:backdrop-blur-xl',
        'glass:inset-x-3.5 glass:bottom-[var(--nav-offset)] glass:rounded-pill glass:border-ui glass:border-border-subtle glass:bg-canvas-elevated glass:p-1.5 glass:shadow-sheet',
      )}
    >
      <LayoutGroup id="bottom-nav">
        <div className="flex w-full items-stretch justify-between px-2 modern:px-0 glass:px-0">
          {navItems.map(({ to, label, icon: Icon, match }) => {
            const active = isNavActive(pathname, to, match)
            return (
              <m.div
                key={to}
                layout
                transition={indicator}
                className="relative h-14 min-w-0 flex-1 modern:h-12 modern:flex-none glass:h-12 glass:flex-none"
              >
                <Link
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative block size-full rounded-pill transition-[color] duration-normal ease-out',
                    active ? 'text-ink' : 'text-ink-faint hover:text-ink-muted',
                    active && 'modern:text-on-accent glass:text-on-accent',
                  )}
                >
                  {/* Walnut: short top tick that slides between tabs */}
                  {active ? (
                    <m.span
                      layoutId="bottom-nav-tick"
                      transition={indicator}
                      aria-hidden
                      className="absolute inset-x-0 -top-1.5 mx-auto h-[3px] w-6 rounded-b-[3px] bg-ink modern:hidden glass:hidden"
                    />
                  ) : null}

                  {/* Modern / Glass: sliding active fill */}
                  {active ? (
                    <m.span
                      layoutId="bottom-nav-pill"
                      transition={indicator}
                      aria-hidden
                      className="absolute inset-0 hidden rounded-pill modern:block modern:bg-accent glass:block glass:bg-accent"
                    />
                  ) : null}

                  {/* Press scale lives here, not on the indicator's parent, so the
                      indicator never measures a mid-press (scaled) box. */}
                  <m.span
                    layout
                    whileTap={tap.medium}
                    transition={snappy}
                    className={cn(
                      'relative z-[1] flex size-full min-w-0 flex-col items-center justify-center gap-1 font-label text-xs font-semibold',
                      'modern:flex-row modern:gap-2 modern:px-3.5 modern:text-sm',
                      'glass:flex-row glass:gap-2 glass:px-3.5 glass:text-sm',
                    )}
                  >
                    <Icon className="size-[22px] shrink-0" />
                    <span
                      className={cn(
                        'truncate',
                        active
                          ? 'modern:animate-label-in glass:animate-label-in'
                          : 'modern:sr-only glass:sr-only',
                      )}
                    >
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
