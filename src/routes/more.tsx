import { createFileRoute } from '@tanstack/react-router'
import {
  useCurrentUser,
  useHAConnection,
  useSensor,
  useSwitch,
} from 'hass-react'
import { entities } from '#/config/dashboard'
import { haUrl } from '#/config/ha'
import { entityName } from '#/lib/entityName'
import { cn } from '#/lib/cn'
import { HouseModeGrid } from '#/components/home/HouseModeGrid'
import { LockTile } from '#/components/entities/LockTile'
import { SwitchRow } from '#/components/entities/SwitchRow'
import { VacuumTile } from '#/components/entities/VacuumTile'
import { LocationSettings } from '#/components/location/LocationSettings'
import { UpdateSettings } from '#/components/update/UpdateSettings'
import { isTauri } from '#/lib/deviceLocation'
import { Page } from '#/components/layout/Page'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'
import { Button } from '#/components/ui/button'
import { Separator } from '#/components/ui/separator'
import { Switch } from '#/components/ui/switch'
import { notify } from '#/components/ui/toast'

function ApplianceRow({
  powerId,
  statusId,
  label,
}: {
  powerId: string
  statusId: string
  label: string
}) {
  const status = useSensor(statusId)
  const power = useSwitch(powerId)
  const statusLabel = status.isUnavailable
    ? '—'
    : String(status.value ?? status.state).replace(/_/g, ' ')

  return (
    <div
      className={cn(
        'flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface px-3.5 py-2 sm:px-4',
        power.isUnavailable && 'opacity-40',
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{label}</p>
        <p className="truncate text-xs capitalize text-ink-muted">{statusLabel}</p>
      </div>
      <Switch
        checked={power.isOn}
        disabled={power.isUnavailable}
        onCheckedChange={() => {
          void power.toggle().catch((e) =>
            notify('Switch failed', e instanceof Error ? e.message : 'Error'),
          )
        }}
      />
    </div>
  )
}

function MorePage() {
  const user = useCurrentUser()
  const { connected, logout } = useHAConnection()

  return (
    <Page>
      <PageHeader
        title="More"
        subtitle={user?.name ? `Signed in as ${user.name}` : 'House extras'}
      />

      <Section title="House mode">
        <HouseModeGrid />
      </Section>

      <Section title="Front door">
        <LockTile entityId={entities.lock} />
      </Section>

      <Section title="Vacuum">
        <VacuumTile entityId={entities.vacuum} />
      </Section>

      <Section title="Appliances">
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-2.5">
          <ApplianceRow
            label="Washer"
            powerId={entities.appliances.washerPower}
            statusId={entities.appliances.washerStatus}
          />
          <ApplianceRow
            label="WashTower"
            powerId={entities.appliances.washtowerPower}
            statusId={entities.appliances.washtowerStatus}
          />
          <ApplianceRow
            label="Dishwasher"
            powerId={entities.appliances.dishwasherPower}
            statusId={entities.appliances.dishwasherStatus}
          />
        </div>
      </Section>

      <Section title="Irrigation">
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-2.5">
          {entities.sprinklers.map((id) => (
            <SwitchRow key={id} entityId={id} label={entityName(id)} />
          ))}
        </div>
      </Section>

      <Separator className="my-1" />

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

export const Route = createFileRoute('/more')({ component: MorePage })
