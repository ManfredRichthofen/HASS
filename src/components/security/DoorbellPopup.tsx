import { useBinarySensor, useBinarySensors, useCameras } from 'hass-react'
import { Bell } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { DoorbellEventViewer } from '#/components/security/DoorbellEventViewer'
import { Dialog, DialogContent } from '#/components/ui/dialog'
import { entities } from '#/config/dashboard'
import { frigateCameraFromEntity } from '#/lib/frigate'

const CameraStream = lazy(() =>
  import('#/components/entities/CameraStream').then((mod) => ({ default: mod.CameraStream })),
)

const AUTO_CLOSE_MS = 90_000

function looksLikeDoorbellCamera(entityId: string, friendlyName?: string | null) {
  const hay = `${entityId} ${friendlyName ?? ''}`.toLowerCase()
  if (!hay.includes('doorbell')) return false
  // Skip Frigate snapshot / birdseye helpers.
  if (hay.includes('birdseye') || hay.includes('snapshot')) return false
  return entityId.startsWith('camera.')
}

function looksLikeDoorbellRing(entityId: string, friendlyName?: string | null) {
  const hay = `${entityId} ${friendlyName ?? ''}`.toLowerCase()
  if (!hay.includes('doorbell')) return false
  // Prefer visitor / ding / button — never treat motion or person as a ring.
  if (/(visitor|ding|button|ring|pressed)/.test(hay)) return true
  return false
}

function resolveDoorbellIds(
  cameras: Array<{ entity_id: string; attributes: { friendly_name?: string } }>,
  binarySensors: Array<{ entity_id: string; attributes: { friendly_name?: string } }>,
) {
  const configuredCamera = entities.doorbell.cameraId
  const configuredRing = entities.doorbell.ringId

  const cameraFromConfig = cameras.find((c) => c.entity_id === configuredCamera)
  const camera =
    cameraFromConfig?.entity_id ??
    cameras.find((c) =>
      looksLikeDoorbellCamera(c.entity_id, c.attributes.friendly_name),
    )?.entity_id ??
    configuredCamera

  const ringFromConfig = binarySensors.find((s) => s.entity_id === configuredRing)
  const ring =
    ringFromConfig?.entity_id ??
    binarySensors.find((s) =>
      looksLikeDoorbellRing(s.entity_id, s.attributes.friendly_name),
    )?.entity_id ??
    configuredRing

  return { cameraId: camera, ringId: ring }
}

/**
 * Watches the doorbell visitor sensor and pops a live Frigate stream + event viewer.
 */
export function DoorbellPopup() {
  const cameras = useCameras()
  const binarySensors = useBinarySensors()
  const { cameraId, ringId } = resolveDoorbellIds(cameras, binarySensors)

  const ring = useBinarySensor(ringId)
  const [open, setOpen] = useState(false)
  const prevOn = useRef<boolean | null>(null)

  const frigateCamera =
    entities.doorbell.frigateCamera || frigateCameraFromEntity(cameraId)
  const frigateInstanceId = entities.doorbell.frigateInstanceId || 'frigate'

  useEffect(() => {
    if (ring.isUnavailable) {
      prevOn.current = null
      return
    }

    const on = ring.isOn
    if (prevOn.current === false && on) {
      setOpen(true)
    }
    prevOn.current = on
  }, [ring.isOn, ring.isUnavailable, ring.lastChanged])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => setOpen(false), AUTO_CLOSE_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  if (ring.isUnavailable && cameras.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        title="Doorbell"
        description="Someone is at the door"
        className="max-h-[min(92dvh,52rem)] w-[min(100%-1.5rem,40rem)] overflow-y-auto p-4 sm:p-5"
      >
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <Bell className="size-4 text-accent" />
          <span>Live Frigate view</span>
        </div>
        {open ? (
          <Suspense
            fallback={
              <div className="mt-3 grid aspect-video place-items-center rounded-2xl bg-canvas text-ink-faint">
                <Bell className="size-7 opacity-40" />
              </div>
            }
          >
            <CameraStream entityId={cameraId} className="mt-3" controls muted />
          </Suspense>
        ) : null}

        <DoorbellEventViewer
          camera={frigateCamera}
          instanceId={frigateInstanceId}
          active={open}
        />
      </DialogContent>
    </Dialog>
  )
}
