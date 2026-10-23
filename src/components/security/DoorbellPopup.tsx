import { useBinarySensor, useBinarySensors, useCamera, useCameras } from 'hass-react'
import { Bell } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { DoorbellEventViewer } from '#/components/security/DoorbellEventViewer'
import { Dialog, DialogContent } from '#/components/ui/dialog'
import { entities } from '#/config/dashboard'
import { subscribeDoorbellOpen } from '#/lib/doorbellUi'
import { frigateCameraFromEntity, frigateMetaFromCameraAttributes } from '#/lib/frigate'

const CameraStream = lazy(() =>
  import('#/components/entities/CameraStream').then((mod) => ({ default: mod.CameraStream })),
)

const AUTO_CLOSE_MS = 90_000

function looksLikeDoorbellCamera(entityId: string, friendlyName?: string | null) {
  const hay = `${entityId} ${friendlyName ?? ''}`.toLowerCase()
  if (!hay.includes('doorbell')) return false
  if (hay.includes('birdseye')) return false
  return entityId.startsWith('camera.')
}

function looksLikeDoorbellRing(entityId: string, friendlyName?: string | null) {
  const hay = `${entityId} ${friendlyName ?? ''}`.toLowerCase()
  if (!hay.includes('doorbell')) return false
  if (/(visitor|ding|button|ring|pressed)/.test(hay)) return true
  return false
}

function looksLikeDoorbellMotion(entityId: string, friendlyName?: string | null) {
  const hay = `${entityId} ${friendlyName ?? ''}`.toLowerCase()
  return entityId.startsWith('binary_sensor.') && hay.includes('doorbell') && hay.includes('motion')
}

function resolveDoorbellIds(
  cameras: Array<{ entity_id: string; attributes: { friendly_name?: string } }>,
  binarySensors: Array<{ entity_id: string; attributes: { friendly_name?: string } }>,
) {
  const configuredCamera = entities.doorbell.cameraId
  const configuredRing = entities.doorbell.ringId

  const doorbellCams = cameras.filter((c) =>
    looksLikeDoorbellCamera(c.entity_id, c.attributes.friendly_name),
  )
  // Prefer non-snapshot streams when several doorbell cameras exist.
  const preferredCam = doorbellCams.find((c) => !/snapshot/i.test(c.entity_id)) ?? doorbellCams[0]

  // Last resort: any live cam that isn't a vacuum map / birdseye collage.
  const anyLiveCam = cameras.find((c) => {
    const hay = `${c.entity_id} ${c.attributes.friendly_name ?? ''}`.toLowerCase()
    return c.entity_id.startsWith('camera.') && !/map|birdseye|snapshot/i.test(hay)
  })

  const camera =
    cameras.find((c) => c.entity_id === configuredCamera)?.entity_id ??
    preferredCam?.entity_id ??
    anyLiveCam?.entity_id ??
    configuredCamera

  const ring =
    binarySensors.find((s) => s.entity_id === configuredRing)?.entity_id ??
    binarySensors.find((s) => looksLikeDoorbellRing(s.entity_id, s.attributes.friendly_name))
      ?.entity_id ??
    configuredRing

  const motion =
    binarySensors.find((s) => looksLikeDoorbellMotion(s.entity_id, s.attributes.friendly_name))
      ?.entity_id ?? 'binary_sensor.doorbell_motion'

  return { cameraId: camera, ringId: ring, motionId: motion }
}

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
 */
export function DoorbellPopup() {
  const cameras = useCameras()
  const binarySensors = useBinarySensors()
  const ids = useMemo(() => resolveDoorbellIds(cameras, binarySensors), [cameras, binarySensors])

  const ring = useBinarySensor(ids.ringId)
  const motion = useBinarySensor(ids.motionId)
  const cameraMeta = useCamera(ids.cameraId)
  const [open, setOpen] = useState(false)

  const frigateAttrs = frigateMetaFromCameraAttributes(
    cameraMeta.attributes as Record<string, unknown>,
  )
  // Prefer live Frigate entity attrs (camera_name / client_id) over dashboard guesses.
  const frigateCamera =
    frigateAttrs.cameraName ||
    entities.doorbell.frigateCamera ||
    frigateCameraFromEntity(ids.cameraId)
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
  const cameraLabel = cameraMeta.attributes.friendly_name ?? ids.cameraId.replace(/^camera\./, '')
  const discoveredCams = cameras
    .filter((c) => c.entity_id.startsWith('camera.'))
    .map((c) => c.entity_id)
    .slice(0, 6)

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
          <code className="truncate text-[0.65rem] text-ink-faint">{ids.cameraId}</code>
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
            <CameraStream entityId={ids.cameraId} className="mt-3" controls muted />
          </Suspense>
        ) : null}

        <DoorbellEventViewer camera={frigateCamera} instanceId={frigateInstanceId} active={open} />

        {open ? (
          <p className="mt-2 text-[0.65rem] text-ink-faint">
            Ring <code className="text-ink-muted">{ids.ringId}</code>
            {ring.isUnavailable ? ' (unavailable)' : ring.isOn ? ' (on)' : ' (off)'}
            {' · '}
            Events camera <code className="text-ink-muted">{frigateCamera}</code>
            {discoveredCams.length > 0 ? (
              <>
                {' · '}
                Cams <code className="text-ink-muted">{discoveredCams.join(', ')}</code>
              </>
            ) : null}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
