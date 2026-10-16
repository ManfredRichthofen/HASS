import { useEffect, useState } from 'react'
import { useCamera } from 'hass-react'
import { Map as MapIcon } from 'lucide-react'
import { cn } from '#/lib/cn'

export function VacuumMap({
  cameraId,
  className,
}: {
  cameraId: string
  className?: string
}) {
  const camera = useCamera(cameraId)
  const [bust, setBust] = useState(0)

  useEffect(() => {
    void camera.refreshImage().catch(() => undefined)
    const id = window.setInterval(() => {
      setBust((n) => n + 1)
      void camera.refreshImage().catch(() => undefined)
    }, 15_000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId])

  const src = camera.imageUrl
    ? `${camera.imageUrl}${camera.imageUrl.includes('?') ? '&' : '?'}r=${bust}`
    : null

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-[#0a0d12]',
        className,
      )}
    >
      {src && !camera.isUnavailable ? (
        <img
          src={src}
          alt="Vacuum map"
          className="aspect-[4/3] w-full object-contain"
        />
      ) : (
        <div className="grid aspect-[4/3] place-items-center gap-2 text-ink-faint">
          <MapIcon className="size-7 opacity-40" />
          <p className="text-xs">
            {camera.isUnavailable ? 'Map unavailable' : 'Waiting for map…'}
          </p>
        </div>
      )}
    </div>
  )
}
