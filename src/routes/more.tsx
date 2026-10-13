import { createFileRoute } from '@tanstack/react-router'
import {
  useCurrentUser,
  useHAConnection,
  useSensor,
  useServiceCall,
} from 'hass-react'
import { entities } from '#/config/dashboard'
import { haUrl } from '#/config/ha'
import { LockTile } from '#/components/entities/LockTile'
import { SensorChip } from '#/components/entities/SensorChip'
import { SwitchRow } from '#/components/entities/SwitchRow'
import { VacuumTile } from '#/components/entities/VacuumTile'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'
import { Button } from '#/components/ui/button'
import { Separator } from '#/components/ui/separator'
import { notify } from '#/components/ui/toast'

export const Route = createFileRoute('/more')({ component: MorePage })

function ApplianceStatus({
  powerId,
  statusId,
  label,
}: {
  powerId: string
  statusId: string
  label: string
}) {
  const status = useSensor(statusId)

  return (
    <div className="space-y-2 rounded-3xl border border-border-subtle bg-surface p-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs capitalize text-ink-muted">
          {status.isUnavailable
            ? '—'
            : String(status.value ?? status.state).replace(/_/g, ' ')}
        </p>
      </div>
      <SwitchRow entityId={powerId} label="Power" />
    </div>
  )
}

function MorePage() {
  const user = useCurrentUser()
  const { connected, logout } = useHAConnection()
  const { callService } = useServiceCall()

  async function runScript(entityId: string, label: string) {
    try {
      await callService('script', 'turn_on', { entity_id: entityId })
      notify(label)
    } catch (e) {
      notify('Failed', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div>
      <PageHeader
        title="More"
        subtitle={user?.name ? `Signed in as ${user.name}` : 'House extras'}
      />

      <Section title="House mode">
        <div className="flex flex-wrap gap-2">
          {entities.houseModes.map((mode) => (
            <Button
              key={mode.id}
              size="sm"
              variant="secondary"
              onClick={() => void runScript(mode.id, mode.label)}
            >
              {mode.label}
            </Button>
          ))}
        </div>
      </Section>

      <Section title="Security">
        <LockTile entityId={entities.lock} />
      </Section>

      <Section title="Vacuum">
        <VacuumTile entityId={entities.vacuum} />
      </Section>

      <Section title="Appliances">
        <div className="space-y-3">
          <ApplianceStatus
            label="Washer"
            powerId={entities.appliances.washerPower}
            statusId={entities.appliances.washerStatus}
          />
          <ApplianceStatus
            label="WashTower"
            powerId={entities.appliances.washtowerPower}
            statusId={entities.appliances.washtowerStatus}
          />
          <ApplianceStatus
            label="Dishwasher"
            powerId={entities.appliances.dishwasherPower}
            statusId={entities.appliances.dishwasherStatus}
          />
        </div>
      </Section>

      <Section title="Irrigation">
        <div className="space-y-2">
          {entities.sprinklers.map((id) => (
            <SwitchRow key={id} entityId={id} />
          ))}
        </div>
      </Section>

      <Section title="Sensors">
        <div className="grid grid-cols-2 gap-3">
          <SensorChip entityId={entities.outdoorTemp} label="Outside" />
          <SensorChip
            entityId="sensor.mts300_humidity"
            label="Living humidity"
          />
        </div>
      </Section>

      <Separator className="my-6" />

      <Section title="Connection">
        <div className="space-y-3 rounded-3xl border border-border-subtle bg-surface p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Status</span>
            <span className={connected ? 'text-success' : 'text-danger'}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-ink-muted">Home Assistant</span>
            <span className="truncate text-ink">{haUrl}</span>
          </div>
          <Button variant="danger" className="w-full" onClick={() => logout()}>
            Log out
          </Button>
        </div>
      </Section>
    </div>
  )
}
