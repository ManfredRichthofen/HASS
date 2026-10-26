import { createFileRoute } from '@tanstack/react-router'
import { useCurrentUser, useHAConnection } from 'hass-react'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'
import { LocationSettings } from '#/components/location/LocationSettings'
import { ThemePicker } from '#/components/settings/ThemePicker'
import { Button } from '#/components/ui/button'
import { UpdateSettings } from '#/components/update/UpdateSettings'
import { haUrl } from '#/config/ha'
import { cn } from '#/lib/cn'
import { isTauri } from '#/lib/deviceLocation'
import { m, staggerContainer } from '#/lib/motion'

export const Route = createFileRoute('/settings')({ component: SettingsPage })

function SettingsPage() {
  const user = useCurrentUser()
  const { connected, logout } = useHAConnection()

  return (
    <m.div initial="initial" animate="animate" variants={staggerContainer}>
      <Page>
        <PageHeader
          title="Settings"
          subtitle={user?.name ? `Signed in as ${user.name}` : 'This device'}
          backTo="/"
          backLabel="Home"
        />

        <Section title="Theme">
          <ThemePicker />
        </Section>

        <div className="grid items-start gap-section @2xl:grid-cols-2 @2xl:gap-8">
          <Section title="This device">
            <LocationSettings />
          </Section>

          {isTauri() ? (
            <Section title="App updates">
              <UpdateSettings />
            </Section>
          ) : null}

          <Section title="Connection">
            <div className="grid gap-4 rounded-card border-ui border-border-subtle bg-surface p-4 shadow-card sm:p-5 modern:border-transparent">
              <div className="flex min-h-11 items-center justify-between gap-3">
                <span className="text-label">Status</span>
                <span
                  className={cn(
                    'inline-flex items-center gap-2 text-sm font-semibold',
                    connected ? 'text-success' : 'text-danger',
                  )}
                >
                  <span
                    className={cn('size-2 rounded-pill', connected ? 'bg-success' : 'bg-danger')}
                  />
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-label shrink-0 pt-0.5">Home Assistant</span>
                <span className="min-w-0 text-right text-sm break-all text-ink">{haUrl}</span>
              </div>
              <Button variant="danger" className="w-full" onClick={() => logout()}>
                Log out
              </Button>
            </div>
          </Section>
        </div>
      </Page>
    </m.div>
  )
}
