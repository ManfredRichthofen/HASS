import { useCamera, useHAConnection } from 'hass-react'
import { Loader2, VideoOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { haUrl } from '#/config/ha'
import { cn } from '#/lib/cn'

function canPlayNativeHls(video: HTMLVideoElement) {
  return Boolean(video.canPlayType('application/vnd.apple.mpegurl'))
}

/** Lazy-load hls.js (~500 kB) only when Chromium needs MSE playback. */
async function loadHls() {
  const mod = await import('hls.js')
  return mod.default
}

function httpBase(url: string | undefined | null) {
  if (!url) return null
  return url
    .replace(/^ws:\/\//, 'http://')
    .replace(/^wss:\/\//, 'https://')
    .replace(/\/$/, '')
}

function withTimeout<T>(promise: Promise<T>, ms: number, label = 'timeout'): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(label)), ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        window.clearTimeout(timer)
        reject(err)
      },
    )
  })
}

/**
 * Live camera player for Tauri/Chromium (hls.js) and Safari (native HLS).
 * Shows still/MJPEG immediately, then upgrades to HLS when it actually starts.
 */
export function CameraStream({
  entityId,
  className,
  autoPlay = true,
  muted = true,
  controls = false,
}: {
  entityId: string
  className?: string
  autoPlay?: boolean
  muted?: boolean
  controls?: boolean
}) {
  const camera = useCamera(entityId)
  const { connection, config } = useHAConnection()
  const videoRef = useRef<HTMLVideoElement>(null)
  const mjpegRef = useRef<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'hls' | 'mjpeg' | 'still' | null>(null)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [booting, setBooting] = useState(true)

  const base = httpBase(config?.url ?? haUrl)
  const stillUrl = camera.imageUrl

  useEffect(() => {
    if (camera.isUnavailable) {
      setBooting(false)
      setMode(null)
      setStreamUrl(null)
      mjpegRef.current = null
      return
    }

    let cancelled = false
    setError(null)
    setBooting(true)

    const token = camera.accessToken
    const mjpeg =
      token && base
        ? `${base}/api/camera_proxy_stream/${entityId}?token=${encodeURIComponent(token)}`
        : null
    mjpegRef.current = mjpeg

    // Paint something immediately — don't wait on camera/stream (can hang on Frigate).
    if (mjpeg) {
      setMode('mjpeg')
      setStreamUrl(mjpeg)
      setBooting(false)
    } else if (stillUrl) {
      setMode('still')
      setStreamUrl(stillUrl)
      setBooting(false)
    }

    async function tryHls() {
      // Bypass hass-react's supportsStream gate — Frigate often streams anyway.
      if (!connection) return
      try {
        const response = await withTimeout(
          connection.sendMessagePromise<{ url?: string }>({
            type: 'camera/stream',
            entity_id: entityId,
          }),
          8_000,
          'HLS start timed out',
        )
        const path = response?.url
        if (!path || cancelled) return
        const absolute = path.startsWith('/') ? `${base ?? ''}${path}` : path
        if (!absolute) return
        setMode('hls')
        setStreamUrl(absolute)
        setError(null)
        setBooting(false)
      } catch {
        // Keep MJPEG/still — do not blank the view.
        if (!cancelled && !mjpegRef.current && !stillUrl) {
          setError('Stream unavailable')
          setBooting(false)
        }
      }
    }

    void tryHls()

    return () => {
      cancelled = true
    }
  }, [base, camera.accessToken, camera.isUnavailable, connection, entityId, stillUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video || mode !== 'hls' || !streamUrl) return

    let cancelled = false
    let hls: { destroy: () => void } | null = null

    const fallBack = (message: string) => {
      if (cancelled) return
      const mjpeg = mjpegRef.current
      if (mjpeg) {
        setMode('mjpeg')
        setStreamUrl(mjpeg)
        setError(null)
        return
      }
      if (stillUrl) {
        setMode('still')
        setStreamUrl(stillUrl)
        setError(message)
        return
      }
      setError(message)
    }

    if (canPlayNativeHls(video)) {
      video.src = streamUrl
      if (autoPlay) void video.play().catch(() => undefined)
      return () => {
        cancelled = true
        video.pause()
        video.removeAttribute('src')
        video.load()
      }
    }

    void loadHls().then((Hls) => {
      if (cancelled) return
      if (!Hls.isSupported()) {
        fallBack('HLS not supported in this browser')
        return
      }

      const instance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      })
      if (cancelled) {
        instance.destroy()
        return
      }
      hls = instance
      instance.loadSource(streamUrl)
      instance.attachMedia(video)
      instance.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          instance.destroy()
          fallBack(data.type === Hls.ErrorTypes.NETWORK_ERROR ? 'Network error' : 'Playback error')
        }
      })
      if (autoPlay) {
        instance.on(Hls.Events.MANIFEST_PARSED, () => {
          void video.play().catch(() => undefined)
        })
      }
    })

    return () => {
      cancelled = true
      hls?.destroy()
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [autoPlay, mode, stillUrl, streamUrl])

  if (camera.isUnavailable) {
    return (
      <div
        className={cn(
          'grid aspect-video place-items-center gap-2 rounded-card bg-canvas text-ink-faint',
          className,
        )}
      >
        <VideoOff className="size-7 opacity-40" />
        <p className="text-xs">Camera unavailable</p>
        <p className="max-w-[16rem] truncate px-3 text-[0.65rem] opacity-70">{entityId}</p>
      </div>
    )
  }

  if (error && !streamUrl) {
    return (
      <div
        className={cn(
          'grid aspect-video place-items-center gap-2 rounded-card bg-canvas px-4 text-center text-ink-faint',
          className,
        )}
      >
        <VideoOff className="size-7 opacity-40" />
        <p className="text-xs">{error}</p>
        <p className="max-w-[16rem] truncate text-[0.65rem] opacity-70">{entityId}</p>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden rounded-card bg-canvas', className)}>
      {booting && !streamUrl ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-canvas/80">
          <Loader2 className="size-6 animate-spin text-ink-muted" />
        </div>
      ) : null}

      {mode === 'mjpeg' && streamUrl ? (
        <img src={streamUrl} alt="Live camera" className="aspect-video w-full object-contain" />
      ) : mode === 'still' && streamUrl ? (
        <img src={streamUrl} alt="Camera still" className="aspect-video w-full object-contain" />
      ) : (
        <video
          ref={videoRef}
          className="aspect-video w-full object-contain"
          playsInline
          muted={muted}
          controls={controls}
          autoPlay={autoPlay}
          poster={stillUrl ?? undefined}
        />
      )}

      {error && (mode === 'still' || mode === 'mjpeg') ? (
        <p className="absolute inset-x-0 bottom-0 bg-canvas/80 px-3 py-1.5 text-center text-[0.65rem] text-ink-muted">
          {error} — showing {mode === 'still' ? 'still' : 'MJPEG'}
        </p>
      ) : null}
    </div>
  )
}
