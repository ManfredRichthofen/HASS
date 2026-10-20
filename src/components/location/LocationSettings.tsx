import { MapPin } from 'lucide-react'
import { useLocationSharing } from '#/components/location/LocationProvider'
import { Switch } from '#/components/ui/switch'
import { notify } from '#/components/ui/toast'

export function LocationSettings() {
  const location = useLocationSharing()

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-accent" aria-hidden />
            <p className="text-sm font-semibold text-ink">Enable location based automations</p>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {location.native
              ? 'Reports this phone to Home Assistant in the background so presence and location automations can run.'
              : 'Reports this browser to Home Assistant while Casa is open so presence and location automations can run.'}
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
    </div>
  )
}
