import { Link, useRouterState } from '@tanstack/react-router'
import {
  Home,
  LayoutGrid,
  Thermometer,
  Shield,
  Ellipsis,
} from 'lucide-react'
import { cn } from '#/lib/cn'

const items = [
  { to: '/', label: 'Home', icon: Home, match: 'exact' as const },
  { to: '/rooms', label: 'Rooms', icon: LayoutGrid, match: 'prefix' as const },
  { to: '/climate', label: 'Climate', icon: Thermometer, match: 'prefix' as const },
  { to: '/security', label: 'Security', icon: Shield, match: 'prefix' as const },
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
      <div className="mx-auto flex max-w-3xl items-stretch justify-between px-2 pt-1.5">
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
                'relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[11px] font-medium transition',
                active ? 'text-accent' : 'text-ink-muted hover:text-ink',
              )}
            >
              <Icon
                className={cn(
                  'size-5',
                  active && 'drop-shadow-[0_0_8px_#e8a54b66]',
                )}
                strokeWidth={active ? 2.4 : 2}
              />
              <span>{label}</span>
              {active ? (
                <span className="absolute inset-x-5 -bottom-0.5 h-0.5 rounded-full bg-accent" />
              ) : null}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
