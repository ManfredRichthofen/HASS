import { useCamera } from 'hass-react'
import { Camera, Video } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Drawer, DrawerContent } from '#/components/ui/drawer'
import { cn } from '#/lib/cn'
import { entityName } from '#/lib/entityName'
import { m, tap } from '#/lib/motion'

const CameraStream = lazy(() =>
  import('#/components/entities/CameraStream').then((mod) => ({ default: mod.CameraStream })),
)

export function CameraTile({ entityId, label }: { entityId: string; label?: string }) {
  const camera = useCamera(entityId)
  const [open, setOpen] = useState(false)
  const name = label ?? entityName(entityId, camera.attributes.friendly_name)
  const unavailable = camera.isUnavailable
  const src = camera.imageUrl
  const refreshImage = camera.refreshImage

  useEffect(() => {
    if (!open) return
    void refreshImage().catch(() => undefined)
  }, [open, refreshImage])

  return (
    <>
      <m.button
        type="button"
        disabled={unavailable}
        whileTap={tap.soft}
        onClick={() => setOpen(true)}
        className={cn(
          'group relative flex min-h-[8.5rem] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface text-left transition-ui',
          'hover:border-border hover:bg-surface-hover',
          unavailable && 'opacity-40',
        )}
      >
        <div className="relative min-h-0 flex-1 overflow-hidden bg-canvas">
          {src && !unavailable ? (
            <img
              src={src}
              alt={name}
              className="absolute inset-0 size-full object-cover transition-ui group-hover:scale-[1.02]"
            />
          ) : (
            <div className="grid size-full place-items-center text-ink-faint">
              <Camera className="size-7 opacity-40" />
            </div>
          )}
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-canvas/90 via-canvas/40 to-transparent px-3 pb-2.5 pt-8">
            <span className="flex items-center gap-1.5">
              <Video className="size-3.5 shrink-0 text-ink-muted" />
              <span className="truncate text-sm font-semibold text-ink">{name}</span>
            </span>
          </span>
        </div>
      </m.button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent title={name} description="Live view" className="max-w-2xl">
          {open ? (
            <Suspense
              fallback={
                <div className="mt-1 grid aspect-video place-items-center rounded-2xl bg-canvas text-ink-faint">
                  <Video className="size-7 opacity-40" />
                </div>
              }
            >
              <CameraStream entityId={entityId} className="mt-1" />
            </Suspense>
          ) : null}
        </DrawerContent>
      </Drawer>
    </>
  )
}
