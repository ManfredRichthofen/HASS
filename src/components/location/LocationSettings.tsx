import { MapPin } from 'lucide-react'
import { useLocationSharing } from '#/components/location/LocationProvider'
import { Switch } from '#/components/ui/switch'
import { notify } from '#/components/ui/toast'

export function LocationSettings() {
  const location = useLocationSharing()

  return (
    <div className="rounded-card border-ui border-border-subtle bg-surface shadow-card modern:border-transparent p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-accent" aria-hidden />
            <p className="text-sm font-semibold text-ink">Enable location based automations</p>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {location.native
              ? 'Reports this phone to its own Template device_tracker webhook in the background.'
              : 'Reports this browser to its own Template device_tracker webhook while Casa is open.'}{' '}
            Each person/device gets a separate tracker.
          </p>
          {location.error ? <p className="mt-2 text-xs text-danger">{location.error}</p> : null}
        </div>
        <Switch
          checked={location.enabled}
          disabled={!location.supported || location.reporting}
          onCheckedChange={(checked) => {
            if (!checked) {
              void location.setEnabled(false)
              notify('Location automations off')
              return
            }
            notify(location.native ? 'Starting background location…' : 'Requesting location…')
            void location.setEnabled(true).then((result) => {
              if (result.ok) notify('Location automations on')
              else notify('Could not enable location', result.message)
            })
          }}
        />
      </div>

      <details className="mt-3 rounded-control border border-border-subtle bg-canvas/40 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-ink-muted">
          Home Assistant setup for this device (one-time)
        </summary>
        <div className="mt-2 space-y-2 text-xs text-ink-muted">
          <p>
            Every Casa user pastes <span className="text-ink">their</span> snippet below into Home
            Assistant, then assigns{' '}
            <code className="text-ink">{location.entityId ?? 'device_tracker.…'}</code> to their
            Person. Webhook: <code className="text-ink">{location.webhookId || '…'}</code>
          </p>
          {location.templateYaml ? (
            <pre className="overflow-x-auto rounded-control border border-border-subtle bg-canvas p-2 text-[0.7rem] leading-relaxed text-ink">
              {location.templateYaml}
            </pre>
          ) : (
            <p>Connect this device first to generate its Template YAML.</p>
          )}
          <p>
            Docs:{' '}
            <a
              className="text-accent underline-offset-2 hover:underline"
              href="https://www.home-assistant.io/integrations/template/#device-tracker"
              target="_blank"
              rel="noreferrer"
            >
              Template device tracker
            </a>
          </p>
        </div>
      </details>
    </div>
  )
}
