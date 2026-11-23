import { Settings } from 'lucide-react'
import { navItems } from '#/components/layout/navItems'
import { cn } from '#/lib/cn'

/**
 * Pre-mount stand-in for the app shell (the `ClientOnly` fallback in __root).
 * It is server-rendered, so the themed nav and a Home-shaped skeleton paint
 * before the main chunk has evaluated. Static on purpose: no hooks, no motion,
 * no router links — just the same chrome silhouettes as SideNav / BottomNav.
 */
export function ShellSkeleton() {
  return (
    <div className="root flex min-h-dvh w-full flex-col md:pl-[5.5rem] lg:pl-60" aria-busy="true">
      <nav
        aria-hidden
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden w-[5.5rem] flex-col border-r border-border-subtle bg-canvas-elevated md:flex lg:w-60',
          'pt-[max(1.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]',
          'modern:border-r-0 modern:bg-transparent glass:border-r glass:border-border-subtle glass:bg-canvas',
        )}
      >
        <p className="text-display mb-7 hidden px-6 text-2xl text-ink lg:block">Home</p>
        <div className="flex flex-1 flex-col gap-1 px-2 lg:px-3.5">
          {navItems.map(({ to, label, icon: Icon }, i) => (
            <span
              key={to}
              className={cn(
                'flex min-h-12 items-center gap-3.5 rounded-control px-3 text-[0.9375rem] font-semibold text-ink-muted',
                'max-lg:min-h-15 max-lg:flex-col max-lg:justify-center max-lg:gap-1 max-lg:px-1 max-lg:text-xs',
                i === 0 && 'bg-accent-soft text-ink modern:bg-surface glass:bg-surface',
              )}
            >
              <Icon className="size-[22px] shrink-0" />
              <span className="truncate">{label}</span>
            </span>
          ))}
        </div>
        <div className="px-2 lg:px-3.5">
          <span className="flex min-h-12 items-center gap-3.5 px-3 text-[0.9375rem] font-semibold text-ink-muted max-lg:min-h-15 max-lg:flex-col max-lg:justify-center max-lg:gap-1 max-lg:px-1 max-lg:text-xs">
            <Settings className="size-[22px] shrink-0" />
            <span className="truncate">Settings</span>
          </span>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[80rem] flex-1 px-page pt-3 sm:px-5 md:px-6 md:pt-4 lg:px-8">
        <div className="grid animate-pulse gap-section @xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="grid gap-3 py-2">
            <div className="h-8 w-3/4 rounded-control bg-surface-hover" />
            <div className="h-8 w-1/2 rounded-control bg-surface-hover" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 w-32 shrink-0 rounded-card bg-surface-hover" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="aspect-[1/1.12] min-h-38 rounded-card bg-surface-hover md:aspect-auto md:h-36 md:min-h-0"
              />
            ))}
          </div>
        </div>
      </main>

      <nav
        aria-hidden
        className={cn(
          'fixed inset-x-3.5 bottom-[var(--nav-offset)] z-40 rounded-pill p-1.5 md:hidden',
          'modern:bg-surface/88',
          'glass:border-ui glass:border-border-subtle glass:bg-canvas-elevated',
        )}
      >
        <div className="flex w-full items-stretch justify-between">
          {navItems.map(({ to, label, icon: Icon }, i) => (
            <span
              key={to}
              className={cn(
                'flex h-12 min-w-0 items-center justify-center gap-2 rounded-pill px-3.5 font-label text-sm font-semibold text-ink-faint',
                i === 0 && 'bg-accent text-on-accent',
              )}
            >
              <Icon className="size-[22px] shrink-0" />
              <span className={i === 0 ? 'truncate' : 'sr-only'}>
                {label}
              </span>
            </span>
          ))}
        </div>
      </nav>
    </div>
  )
}
