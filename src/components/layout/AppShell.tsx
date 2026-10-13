import { ClientOnly, Outlet } from '@tanstack/react-router'
import { useAuth, useHAConnection } from 'hass-react'
import { haUrl } from '#/config/ha'
import { BottomNav } from '#/components/layout/BottomNav'
import { ToastProvider } from '#/components/ui/toast'

function ConnectedShell({ children }: { children: React.ReactNode }) {
  const url = haUrl!
  const { connected, connecting, error, reconnect } = useHAConnection()
  const { isAuthenticated, isLoading } = useAuth(url, 'oauth')

  if (isLoading || connecting) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6">
        <div className="size-10 animate-pulse rounded-full bg-accent/30" />
        <p className="text-sm text-ink-muted">Connecting to Home Assistant…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-danger">Connection failed: {error.message}</p>
        <button
          type="button"
          onClick={reconnect}
          className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-canvas"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!isAuthenticated || !connected) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <p className="text-sm text-ink-muted">
          Redirecting to Home Assistant to sign in…
        </p>
      </div>
    )
  }

  return children
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

export function AppShell() {
  return (
    <ToastProvider>
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
        <ClientOnly
          fallback={
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="size-10 animate-pulse rounded-full bg-accent/30" />
            </div>
          }
        >
          <AuthGate>
            <main className="flex-1 overflow-x-hidden px-4 pb-24 pt-4 md:px-6">
              <Outlet />
            </main>
            <BottomNav />
          </AuthGate>
        </ClientOnly>
      </div>
    </ToastProvider>
  )
}
