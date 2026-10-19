import { createFileRoute } from '@tanstack/react-router'
import { useCurrentUser, useHAConnection } from 'hass-react'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'
import { LocationSettings } from '#/components/location/LocationSettings'
import { Button } from '#/components/ui/button'
import { UpdateSettings } from '#/components/update/UpdateSettings'
import { haUrl } from '#/config/ha'
import { isTauri } from '#/lib/deviceLocation'

export const Route = createFileRoute('/settings')({ component: SettingsPage })

function SettingsPage() {
  const user = useCurrentUser()
  const { connected, logout } = useHAConnection()

  return (
    <Page>
      <PageHeader
        title="Settings"
        subtitle={user?.name ? `Signed in as ${user.name}` : 'This device'}
        backTo="/"
        backLabel="Home"
      />

      <Section title="This device">
        <LocationSettings />
      </Section>

      {isTauri() ? (
        <Section title="App updates">
          <UpdateSettings />
        </Section>
      ) : null}

      <Section title="Connection">
        <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface p-4">
          <div className="flex min-h-11 items-center justify-between text-sm">
            <span className="text-ink-muted">Status</span>
            <span className={connected ? 'text-success' : 'text-danger'}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="shrink-0 text-ink-muted">Home Assistant</span>
            <span className="min-w-0 break-all text-right text-ink">{haUrl}</span>
          </div>
          <Button variant="danger" className="w-full" onClick={() => logout()}>
            Log out
          </Button>
        </div>
      </Section>
    </Page>
  )
}
