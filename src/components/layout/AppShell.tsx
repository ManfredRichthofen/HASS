import { Outlet, useRouterState } from '@tanstack/react-router'
import { useHAConnection } from 'hass-react'
import { BottomNav } from '#/components/layout/BottomNav'
import { NowPlayingBar } from '#/components/layout/NowPlayingBar'
import { LocationProvider } from '#/components/location/LocationProvider'
import { ToastProvider } from '#/components/ui/toast'
import { UpdateChecker } from '#/components/update/UpdateChecker'
import { haUrl } from '#/config/ha'
import { AnimatePresence, domAnimation, LazyMotion, MotionConfig, m, pageFade } from '#/lib/motion'

function ConnectingSplash({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6">
      <div className="size-10 animate-pulse rounded-full bg-accent/30" />
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  )
}

function ConnectionAction({
  title,
  detail,
  actionLabel,
  onAction,
}: {
  title: string
  detail?: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="size-10 animate-pulse rounded-full bg-accent/30" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {detail ? <p className="text-sm text-ink-muted">{detail}</p> : null}
      </div>
      <button
        type="button"
        onClick={onAction}
        className="touch-target rounded-xl bg-accent px-4 text-sm font-semibold text-canvas"
      >
        {actionLabel}
      </button>
    </div>
  )
}

function ConnectedShell({ children }: { children: React.ReactNode }) {
  const {
    connected,
    connecting,
    error,
    reconnect,
    connectionState,
    isAutoRetrying,
    nextRetryIn,
    lastConnectedAt,
  } = useHAConnection()

  if (connected) {
    return (
      <LocationProvider>
        <UpdateChecker />
        {children}
      </LocationProvider>
    )
  }

  if (error || isAutoRetrying) {
    const retrySeconds = typeof nextRetryIn === 'number' ? Math.ceil(nextRetryIn / 1000) : null
    const detail = error
      ? error.message
      : retrySeconds != null
        ? `Retrying in ${retrySeconds}s…`
        : 'Retrying shortly…'

    return (
      <ConnectionAction
        title={isAutoRetrying ? 'Reconnecting to Home Assistant…' : 'Connection failed'}
        detail={detail}
        actionLabel="Retry"
        onAction={reconnect}
      />
    )
  }

  if (connecting || (connectionState === 'idle' && !lastConnectedAt)) {
    return <ConnectingSplash label="Connecting to Home Assistant…" />
  }

  return (
    <ConnectionAction
      title="Sign in to Home Assistant"
      detail="Connect this device to continue."
      actionLabel="Sign in"
      onAction={reconnect}
    />
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
          <div className="mx-auto flex min-h-dvh w-full max-w-[88rem] flex-col">
            <AuthGate>
              <main className="flex-1 overflow-x-hidden px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pt-4 md:px-8 lg:px-10">
                <AnimatedOutlet />
              </main>
              <NowPlayingBar />
              <BottomNav />
            </AuthGate>
          </div>
        </LazyMotion>
      </MotionConfig>
    </ToastProvider>
  )
}
