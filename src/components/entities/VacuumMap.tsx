import { useCamera } from 'hass-react'
import { Map as MapIcon } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '#/lib/cn'

export function VacuumMap({
  cameraId,
  className,
  /** When false (docked/idle), refresh less often. */
  active = true,
}: {
  cameraId: string
  className?: string
  active?: boolean
}) {
  const camera = useCamera(cameraId)
  const refreshImage = camera.refreshImage

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'hidden') return
      void refreshImage().catch(() => undefined)
    }

    refresh()
    const intervalMs = active ? 15_000 : 60_000
    const id = window.setInterval(refresh, intervalMs)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active, refreshImage])

  const src = camera.imageUrl

  return (
    <div className={cn('relative overflow-hidden rounded-card bg-canvas', className)}>
      {src && !camera.isUnavailable ? (
        <img
          src={src}
          alt="Vacuum map"
          decoding="async"
          className="aspect-[4/3] w-full object-contain"
        />
      ) : (
        <div className="grid aspect-[4/3] place-items-center gap-2 text-ink-faint">
          <MapIcon className="size-7 opacity-40" />
          <p className="text-xs">{camera.isUnavailable ? 'Map unavailable' : 'Waiting for map…'}</p>
        </div>
      )}
    </div>
  )
}
