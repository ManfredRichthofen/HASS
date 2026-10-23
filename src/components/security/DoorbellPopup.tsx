import { useBinarySensor, useCamera } from 'hass-react'
import { Bell } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { DoorbellEventViewer } from '#/components/security/DoorbellEventViewer'
import { Dialog, DialogContent } from '#/components/ui/dialog'
import { entities } from '#/config/dashboard'
import { subscribeDoorbellOpen } from '#/lib/doorbellUi'
import { frigateCameraFromEntity, frigateMetaFromCameraAttributes } from '#/lib/frigate'

const CameraStream = lazy(() =>
  import('#/components/entities/CameraStream').then((mod) => ({ default: mod.CameraStream })),
)

const AUTO_CLOSE_MS = 90_000

const DOORBELL_IDS = {
  cameraId: entities.doorbell.cameraId,
  ringId: entities.doorbell.ringId,
  motionId: entities.doorbell.motionId,
} as const

/** True once HA has a real on/off (not the pre-connect "unknown" placeholder). */
function isBinaryReady(state: string) {
  return state === 'on' || state === 'off'
}

/**
 * Fire only on a real off→on edge after the first settled sample.
 * Avoids treating hydrate (`unknown`/`off` → actual `on`) as a ring on every refresh.
 */
function useRisingEdgeOpen(
  sensor: { state: string; isOn: boolean; isUnavailable: boolean; entityId: string },
  enabled: boolean,
  onRise: () => void,
) {
  const prev = useRef<boolean | null>(null)
  const trackedId = useRef(sensor.entityId)
  const onRiseRef = useRef(onRise)
  onRiseRef.current = onRise

  useEffect(() => {
    if (trackedId.current !== sensor.entityId) {
      trackedId.current = sensor.entityId
      prev.current = null
    }

    if (!enabled || sensor.isUnavailable || !isBinaryReady(sensor.state)) {
      if (!enabled || sensor.isUnavailable) prev.current = null
      return
    }

    const on = sensor.isOn
    if (prev.current === null) {
      prev.current = on
      return
    }
    if (prev.current === false && on) onRiseRef.current()
    prev.current = on
  }, [enabled, sensor.entityId, sensor.isOn, sensor.isUnavailable, sensor.state])
}

/**
 * Watches doorbell ring (and motion as fallback) and shows live Frigate + events.
 * Subscribes only to configured entity IDs — not whole camera/binary_sensor domains.
 */
export function DoorbellPopup() {
  const { cameraId, ringId, motionId } = DOORBELL_IDS

  const ring = useBinarySensor(ringId)
  const motion = useBinarySensor(motionId)
  const cameraMeta = useCamera(cameraId)
  const [open, setOpen] = useState(false)

  const frigateAttrs = frigateMetaFromCameraAttributes(
    cameraMeta.attributes as Record<string, unknown>,
  )
  // Prefer live Frigate entity attrs (camera_name / client_id) over dashboard guesses.
  const frigateCamera =
    frigateAttrs.cameraName || entities.doorbell.frigateCamera || frigateCameraFromEntity(cameraId)
  const frigateInstanceId =
    frigateAttrs.clientId || entities.doorbell.frigateInstanceId || 'frigate'

  useEffect(() => subscribeDoorbellOpen((next) => setOpen(next)), [])

  useRisingEdgeOpen(ring, !ring.isUnavailable, () => setOpen(true))
  // Fallback only when the visitor/ring sensor is missing — not while motion is already on.
  useRisingEdgeOpen(motion, ring.isUnavailable && !motion.isUnavailable, () => setOpen(true))

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => setOpen(false), AUTO_CLOSE_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open || cameraMeta.isUnavailable) return
    void cameraMeta.refreshImage().catch(() => undefined)
  }, [open, cameraMeta.isUnavailable, cameraMeta.refreshImage])

  // Keep mounted so we can open from Security even if sensors are briefly unavailable.
  const cameraLabel = cameraMeta.attributes.friendly_name ?? cameraId.replace(/^camera\./, '')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        title="Doorbell"
        description={open ? `Live · ${cameraLabel}` : 'Someone is at the door'}
        className="max-h-[min(92dvh,52rem)] w-[min(100%-1.5rem,40rem)] overflow-y-auto p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Bell className="size-4 text-accent" />
            Live view
          </span>
          <code className="truncate text-[0.65rem] text-ink-faint">{cameraId}</code>
          {cameraMeta.isUnavailable ? <span className="text-danger">unavailable</span> : null}
        </div>

        {open ? (
          <Suspense
            fallback={
              <div className="mt-3 grid aspect-video place-items-center rounded-card bg-canvas text-ink-faint">
                <Bell className="size-7 opacity-40" />
              </div>
            }
          >
            <CameraStream entityId={cameraId} className="mt-3" controls muted />
          </Suspense>
        ) : null}

        <DoorbellEventViewer camera={frigateCamera} instanceId={frigateInstanceId} active={open} />

        {open ? (
          <p className="mt-2 text-[0.65rem] text-ink-faint">
            Ring <code className="text-ink-muted">{ringId}</code>
            {ring.isUnavailable ? ' (unavailable)' : ring.isOn ? ' (on)' : ' (off)'}
            {' · '}
            Events camera <code className="text-ink-muted">{frigateCamera}</code>
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
