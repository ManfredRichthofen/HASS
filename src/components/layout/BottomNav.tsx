import { Link, useRouterState } from '@tanstack/react-router'
import {
  Home,
  LayoutGrid,
  Thermometer,
  Music2,
  Ellipsis,
} from 'lucide-react'
import { cn } from '#/lib/cn'
import { LayoutGroup, m, indicator } from '#/lib/motion'

const items = [
  { to: '/', label: 'Home', icon: Home, match: 'exact' as const },
  { to: '/rooms', label: 'Rooms', icon: LayoutGrid, match: 'prefix' as const },
  { to: '/climate', label: 'Climate', icon: Thermometer, match: 'prefix' as const },
  { to: '/media', label: 'Media', icon: Music2, match: 'prefix' as const },
  { to: '/more', label: 'More', icon: Ellipsis, match: 'prefix' as const },
]

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-canvas-elevated/95 backdrop-blur-xl',
        'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
      )}
    >
      <LayoutGroup>
        <div className="mx-auto flex w-full max-w-2xl items-stretch justify-between px-1.5 pt-1 sm:px-3">
          {items.map(({ to, label, icon: Icon, match }) => {
            const active =
              match === 'exact'
                ? pathname === to
                : pathname === to || pathname.startsWith(`${to}/`)

            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 text-[10px] font-medium transition sm:text-[11px]',
                  active ? 'text-accent-strong' : 'text-ink-muted hover:text-ink',
                )}
              >
                <span className="relative grid h-[1.875rem] w-14 place-items-center">
                  {active ? (
                    <m.span
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-full bg-accent-soft"
                      transition={indicator}
                    />
                  ) : null}
                  <Icon
                    className="relative size-5"
                    strokeWidth={active ? 2.4 : 2}
                  />
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
