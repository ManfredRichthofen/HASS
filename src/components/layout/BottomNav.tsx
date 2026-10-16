import { Link, useRouterState } from '@tanstack/react-router'
import {
  Home,
  LayoutGrid,
  Thermometer,
  Music2,
  Shield,
} from 'lucide-react'
import { cn } from '#/lib/cn'
import { LayoutGroup, m, indicator } from '#/lib/motion'

const items = [
  { to: '/', label: 'Home', icon: Home, match: 'exact' as const },
  { to: '/rooms', label: 'Rooms', icon: LayoutGrid, match: 'prefix' as const },
  { to: '/climate', label: 'Climate', icon: Thermometer, match: 'prefix' as const },
  { to: '/media', label: 'Media', icon: Music2, match: 'prefix' as const },
  { to: '/security', label: 'Security', icon: Shield, match: 'prefix' as const },
]

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-canvas-elevated',
        'pb-[max(1rem,env(safe-area-inset-bottom))] pt-2',
      )}
    >
      <LayoutGroup>
        <div className="mx-auto flex w-full max-w-2xl items-stretch justify-between px-2 sm:px-3">
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
                  'relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors',
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
