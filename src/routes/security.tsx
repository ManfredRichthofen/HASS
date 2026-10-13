import { createFileRoute } from '@tanstack/react-router'
import { useServiceCall } from 'hass-react'
import { entities } from '#/config/dashboard'
import { LockTile } from '#/components/entities/LockTile'
import { PageHeader } from '#/components/layout/PageHeader'
import { Section } from '#/components/layout/Section'
import { Button } from '#/components/ui/button'
import { notify } from '#/components/ui/toast'

export const Route = createFileRoute('/security')({ component: SecurityPage })

function SecurityPage() {
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
      <PageHeader title="Security" subtitle="Door, modes, and house status" />

      <Section title="Front door">
        <LockTile entityId={entities.lock} />
      </Section>

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
    </div>
  )
}
