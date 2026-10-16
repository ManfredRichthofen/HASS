import { MapPin } from 'lucide-react'
import { useLocationSharing } from '#/components/location/LocationProvider'
import { formatRelativeTime } from '#/lib/deviceLocation'
import { Button } from '#/components/ui/button'
import { Switch } from '#/components/ui/switch'
import { notify } from '#/components/ui/toast'

export function LocationSettings() {
  const location = useLocationSharing()

  return (
    <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-accent" aria-hidden />
            <p className="text-sm font-semibold text-ink">Share location</p>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {location.native
              ? 'Uses Android background GPS with a persistent notification while sharing is on.'
              : 'Reports this browser to Home Assistant while Casa is open.'}{' '}
            Assign{' '}
            {location.entityId ? (
              <code className="text-ink">{location.entityId}</code>
            ) : (
              'the device tracker'
            )}{' '}
            to a Person for presence.
          </p>
        </div>
        <Switch
          checked={location.enabled}
          disabled={!location.supported || location.reporting}
          onCheckedChange={(checked) => {
            if (!checked) {
              void location.setEnabled(false)
              notify('Location sharing off')
              return
            }
            notify(
              location.native
                ? 'Starting background location…'
                : 'Requesting location…',
            )
            void location.setEnabled(true).then((result) => {
              if (result.ok) notify('Location sharing on')
              else notify('Could not enable location', result.message)
            })
          }}
        />
      </div>

      <div className="space-y-2 text-sm">
        <Row
          label="Permission"
          value={
            location.permission === 'unsupported'
              ? 'Unsupported'
              : location.permission
          }
        />
        {location.native ? (
          <Row
            label="Background"
            value={location.backgroundActive ? 'Active' : 'Off'}
          />
        ) : null}
        <Row
          label="Last report"
          value={
            location.lastReport
              ? formatRelativeTime(location.lastReport.at)
              : '—'
          }
        />
        <Row label="Coordinates" value={location.lastCoords ?? '—'} />
        <Row
          label="Accuracy"
          value={
            location.lastReport?.accuracy != null
              ? `±${location.lastReport.accuracy} m`
              : '—'
          }
        />
        {location.lastReport?.battery != null ? (
          <Row label="Battery" value={`${location.lastReport.battery}%`} />
        ) : null}
        <Row label="Entity" value={location.entityId ?? '—'} mono />
      </div>

      {location.error ? (
        <p className="text-xs text-danger">{location.error}</p>
      ) : null}

      {location.native ? (
        <p className="text-xs text-ink-muted">
          Android: set Location to <span className="text-ink">Allow all the time</span>{' '}
          and allow notifications so tracking continues when Casa is minimized.
        </p>
      ) : null}

      <Button
        variant="secondary"
        className="w-full"
        disabled={!location.supported || location.reporting}
        onClick={() => {
          void location
            .updateNow()
            .then(() => notify('Location sent to Home Assistant'))
            .catch((e) =>
              notify(
                'Location update failed',
                e instanceof Error ? e.message : 'Error',
              ),
            )
        }}
      >
        {location.reporting ? 'Sending…' : 'Update now'}
      </Button>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-ink-muted">{label}</span>
      <span
        className={
          mono
            ? 'min-w-0 break-all text-right font-mono text-xs text-ink'
            : 'min-w-0 break-all text-right capitalize text-ink'
        }
      >
        {value}
      </span>
    </div>
  )
}
