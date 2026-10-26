import { Outlet, useRouterState } from '@tanstack/react-router'
import { useHAConnection } from 'hass-react'
import type { KeyboardEvent, ReactNode } from 'react'
import { BottomNav } from '#/components/layout/BottomNav'
import { NowPlayingBar } from '#/components/layout/NowPlayingBar'
import { SideNav } from '#/components/layout/SideNav'
import { LocationProvider } from '#/components/location/LocationProvider'
import { DoorbellPopup } from '#/components/security/DoorbellPopup'
import { ToastProvider } from '#/components/ui/toast'
import { UpdateChecker } from '#/components/update/UpdateChecker'
import { haUrl } from '#/config/ha'
import { useHAResumeReconnect } from '#/hooks/useHAResumeReconnect'
import { domMax, LazyMotion, MotionConfig, m, pageFade } from '#/lib/motion'

function ConnectingSplash({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6">
      <div className="size-10 animate-pulse rounded-pill bg-on" />
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
      <div className="size-10 animate-pulse rounded-pill bg-on" />
      <div className="space-y-1">
        <p className="text-display text-xl text-ink">{title}</p>
        {detail ? <p className="text-sm text-ink-muted">{detail}</p> : null}
      </div>
      <button
        type="button"
        onClick={onAction}
        className="press touch-target rounded-pill bg-accent px-5 text-sm font-semibold text-on-accent"
      >
        {actionLabel}
      </button>
    </div>
  )
}

function ReconnectBanner({
  label,
  detail,
  onRetry,
}: {
  label: string
  detail?: string
  onRetry: () => void
}) {
  const handleRetry = () => {
    onRetry()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onRetry()
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-40 border-b border-border-subtle bg-surface/95 px-page py-2 backdrop-blur-sm sm:px-6 md:px-8 lg:px-10"
    >
      <div className="mx-auto flex max-w-[80rem] items-center gap-3">
        <div className="size-2.5 shrink-0 animate-pulse rounded-pill bg-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{label}</p>
          {detail ? <p className="truncate text-xs text-ink-muted">{detail}</p> : null}
        </div>
        <button
          type="button"
          onClick={handleRetry}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          aria-label="Retry Home Assistant connection"
          className="press touch-target shrink-0 rounded-pill bg-accent px-3 text-xs font-semibold text-on-accent"
        >
          Retry
        </button>
      </div>
    </div>
  )
}

function ConnectedShell({ children }: { children: ReactNode }) {
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

  useHAResumeReconnect()

  const hasBeenConnected = Boolean(lastConnectedAt)
  const retrySeconds = typeof nextRetryIn === 'number' ? Math.ceil(nextRetryIn / 1000) : null
  const reconnectDetail = error
    ? error.message
    : retrySeconds != null
      ? `Retrying in ${retrySeconds}s…`
      : undefined

  // After a successful session, keep the shell mounted and reconnect quietly
  // in the background (phone wake / network blip) instead of a full-screen splash.
  if (connected || hasBeenConnected) {
    const showReconnectBanner =
      !connected &&
      (connecting || isAutoRetrying || Boolean(error) || connectionState === 'disconnected')

    return (
      <LocationProvider>
        <UpdateChecker />
        <DoorbellPopup />
        {showReconnectBanner ? (
          <ReconnectBanner
            label={
              error && !isAutoRetrying && !connecting
                ? 'Connection lost'
                : 'Reconnecting to Home Assistant…'
            }
            detail={reconnectDetail}
            onRetry={reconnect}
          />
        ) : null}
        {children}
      </LocationProvider>
    )
  }

  if (error || isAutoRetrying) {
    return (
      <ConnectionAction
        title={isAutoRetrying ? 'Reconnecting to Home Assistant…' : 'Connection failed'}
        detail={reconnectDetail ?? 'Retrying shortly…'}
        actionLabel="Retry"
        onAction={reconnect}
      />
    )
  }

  if (connecting || connectionState === 'idle') {
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
  // Top-level section only, so /rooms → /rooms/x keeps the rooms layout mounted.
  const section = useRouterState({ select: (s) => s.location.pathname.split('/')[1] ?? '' })

  // Enter-only: an exiting <Outlet /> re-renders the *new* route, which mounted
  // every page twice per navigation. Opacity-only keeps backdrop-filter surfaces
  // (glass theme) off a moving transform.
  return (
    <m.div
      key={section}
      className="w-full"
      initial={pageFade.initial}
      animate={pageFade.animate}
      transition={pageFade.transition}
    >
      <Outlet />
    </m.div>
  )
}

export function AppShell() {
  return (
    <ToastProvider>
      <MotionConfig reducedMotion="user">
        <LazyMotion features={domMax} strict>
          <div className="flex min-h-dvh w-full flex-col md:pl-[5.5rem] lg:pl-60">
            <AuthGate>
              <SideNav />
              <main className="mx-auto w-full max-w-[80rem] flex-1 overflow-x-hidden px-page pb-[calc(var(--nav-clearance)+1.5rem+var(--now-playing-space))] pt-4 transition-[padding-bottom] duration-slow ease-out sm:px-6 md:px-8 md:pb-[calc(2.5rem+var(--now-playing-space))] md:pt-8 lg:px-10">
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
