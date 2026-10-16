import { Outlet, useRouterState } from '@tanstack/react-router'
import { useAuth, useHAConnection } from 'hass-react'
import { haUrl } from '#/config/ha'
import { LocationProvider } from '#/components/location/LocationProvider'
import { UpdateChecker } from '#/components/update/UpdateChecker'
import { BottomNav } from '#/components/layout/BottomNav'
import { ToastProvider } from '#/components/ui/toast'
import {
  AnimatePresence,
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  pageFade,
} from '#/lib/motion'

function ConnectingSplash({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6">
      <div className="size-10 animate-pulse rounded-full bg-accent/30" />
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  )
}

function ConnectedShell({ children }: { children: React.ReactNode }) {
  const url = haUrl!
  const { connected, connecting, error, reconnect } = useHAConnection()
  const { isAuthenticated, isLoading } = useAuth(url, 'oauth')

  if (isLoading || connecting) {
    return <ConnectingSplash label="Connecting to Home Assistant…" />
  }

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-danger">Connection failed: {error.message}</p>
        <button
          type="button"
          onClick={reconnect}
          className="touch-target rounded-xl bg-accent px-4 text-sm font-semibold text-canvas"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!isAuthenticated || !connected) {
    return <ConnectingSplash label="Redirecting to Home Assistant to sign in…" />
  }

  return (
    <LocationProvider>
      <UpdateChecker />
      {children}
    </LocationProvider>
  )
}

function AuthGate({ children }: { children: React.ReactNode }) {
  if (!haUrl) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center">
        <p className="text-danger">
          Set <code className="text-ink">VITE_HA_URL</code> in <code>.env</code>
        </p>
      </div>
    )
  }

  return <ConnectedShell>{children}</ConnectedShell>
}

function AnimatedOutlet() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={pathname}
        initial={pageFade.initial}
        animate={pageFade.animate}
        exit={pageFade.exit}
        transition={pageFade.transition}
      >
        <Outlet />
      </m.div>
    </AnimatePresence>
  )
}

export function AppShell() {
  return (
    <ToastProvider>
      <MotionConfig reducedMotion="user">
        <LazyMotion features={domAnimation} strict>
          <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col lg:max-w-4xl">
            <AuthGate>
              <main className="flex-1 overflow-x-hidden px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pt-4 md:px-6">
                <AnimatedOutlet />
              </main>
              <BottomNav />
            </AuthGate>
          </div>
        </LazyMotion>
      </MotionConfig>
    </ToastProvider>
  )
}
