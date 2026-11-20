import { Outlet, useRouterState } from '@tanstack/react-router'
import { useHAConnection } from 'hass-react'
import type { KeyboardEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { BottomNav } from '#/components/layout/BottomNav'
import { NowPlayingBar } from '#/components/layout/NowPlayingBar'
import { SideNav } from '#/components/layout/SideNav'
import { LocationProvider } from '#/components/location/LocationProvider'
import { DoorbellPopup } from '#/components/security/DoorbellPopup'
import { ToastProvider } from '#/components/ui/toast'
import { UpdateChecker } from '#/components/update/UpdateChecker'
import { haUrl } from '#/config/ha'
import { useHAResumeReconnect } from '#/hooks/useHAResumeReconnect'
import { LazyMotion, MotionConfig, m, pageFade } from '#/lib/motion'
import { usePerf } from '#/lib/perf'

const loadMotionFeatures = () => import('#/lib/motionFeatures').then((mod) => mod.default)

/** Only surface a connecting notice if HA stays unreachable this long. */
const CONNECTING_NOTICE_DELAY_MS = 3_000

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
      className="sticky top-0 z-40 border-b border-border-subtle bg-surface/95 px-page py-2 backdrop-blur-sm sm:px-5 md:px-6 lg:px-8"
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
          aria-label="Try connecting again"
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
  const reconnectDetail =
    retrySeconds != null
      ? `Trying again in ${retrySeconds}s…`
      : error
        ? 'Check that you’re on the home network, then try again.'
        : undefined

  const isOffline =
    !connected &&
    (connecting ||
      isAutoRetrying ||
      Boolean(error) ||
      connectionState === 'disconnected' ||
      connectionState === 'idle')

  const needsSignIn =
    !connected &&
    !hasBeenConnected &&
    !connecting &&
    !isAutoRetrying &&
    !error &&
    connectionState !== 'idle' &&
    connectionState !== 'disconnected'

  const [showConnectingNotice, setShowConnectingNotice] = useState(false)

  useEffect(() => {
    if (!isOffline) {
      setShowConnectingNotice(false)
      return
    }

    const timer = window.setTimeout(() => {
      setShowConnectingNotice(true)
    }, CONNECTING_NOTICE_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [isOffline])

  // First-time auth only — otherwise keep the shell interactive while HA connects
  // in the background and only show a notice after a short delay.
  if (needsSignIn) {
    return (
      <ConnectionAction
        title="Sign in to Home Assistant"
        detail="Connect this device to continue."
        actionLabel="Sign in"
        onAction={reconnect}
      />
    )
  }

  return (
    <LocationProvider>
      <UpdateChecker />
      <DoorbellPopup />
      {showConnectingNotice ? (
        <ReconnectBanner
          label={
            error && !isAutoRetrying && !connecting
              ? hasBeenConnected
                ? 'Connection lost'
                : 'Unable to connect'
              : hasBeenConnected
                ? 'Reconnecting to Home Assistant…'
                : 'Connecting to Home Assistant…'
          }
          detail={reconnectDetail}
          onRetry={reconnect}
        />
      ) : null}
      {children}
    </LocationProvider>
  )
}

function AuthGate({ children }: { children: React.ReactNode }) {
  if (!haUrl) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center">
        <p className="text-danger">
          This app isn’t connected to the house yet.
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
  const { smooth } = usePerf()
  return (
    <ToastProvider>
      <MotionConfig reducedMotion={smooth ? 'always' : 'user'}>
        <LazyMotion features={loadMotionFeatures} strict>
          <div className="flex min-h-dvh w-full flex-col md:pl-[5.5rem] lg:pl-60">
            <AuthGate>
              <SideNav />
              <main className="mx-auto w-full max-w-[80rem] flex-1 overflow-x-hidden px-page pb-[calc(var(--nav-clearance)+1rem+var(--now-playing-space))] pt-3 transition-[padding-bottom] duration-slow ease-out sm:px-5 md:px-6 md:pb-[calc(2rem+var(--now-playing-space))] md:pt-4 lg:px-8">
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
