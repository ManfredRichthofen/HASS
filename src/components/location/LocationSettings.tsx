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
            <p className="text-sm font-semibold text-ink">Home and away</p>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {location.native
              ? 'Uses this phone’s location so the house knows when you’re home or away, even with the app in the background.'
              : 'Uses this browser’s location while Casa is open so the house knows when you’re home or away.'}{' '}
            Each person uses their own device.
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
          One-time setup
        </summary>
        <div className="mt-2 space-y-2 text-xs text-ink-muted">
          <p>
            Paste the block below into Home Assistant, then assign this device to the right person.
          </p>
          {location.templateYaml ? (
            <pre className="overflow-x-auto rounded-control border border-border-subtle bg-canvas p-2 text-[0.7rem] leading-relaxed text-ink">
              {location.templateYaml}
            </pre>
          ) : (
            <p>Connect this device first to generate its setup block.</p>
          )}
          <p>
            <a
              className="text-accent underline-offset-2 hover:underline"
              href="https://www.home-assistant.io/integrations/template/#device-tracker"
              target="_blank"
              rel="noreferrer"
            >
              How to add a person tracker
            </a>
          </p>
        </div>
      </details>
    </div>
  )
}
