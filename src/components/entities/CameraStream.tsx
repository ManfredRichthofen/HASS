import { useCamera } from 'hass-react'
import Hls from 'hls.js'
import { Loader2, VideoOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '#/lib/cn'

function canPlayNativeHls(video: HTMLVideoElement) {
  return Boolean(video.canPlayType('application/vnd.apple.mpegurl'))
}

/**
 * Live camera player for Tauri/Chromium (hls.js) and Safari (native HLS).
 * Falls back to MJPEG when HLS is unavailable.
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const startStream = camera.startStream
  const stopStream = camera.stopStream
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'hls' | 'mjpeg' | null>(null)

  useEffect(() => {
    if (camera.isUnavailable || !camera.supportsStream) return

    let cancelled = false
    setError(null)
    setMode(null)

    async function start() {
      try {
        await startStream({ type: 'hls' })
        if (!cancelled) setMode('hls')
      } catch {
        try {
          await startStream({ type: 'mjpeg' })
          if (!cancelled) setMode('mjpeg')
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : 'Stream unavailable')
          }
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      void stopStream()
    }
  }, [camera.isUnavailable, camera.supportsStream, startStream, stopStream])

  useEffect(() => {
    const video = videoRef.current
    const url = camera.streamState.url
    if (!video || mode !== 'hls' || !url || !camera.streamState.isActive) return

    let hls: Hls | null = null
    let cancelled = false

    const report = (message: string) => {
      if (!cancelled) setError(message)
    }

    if (canPlayNativeHls(video)) {
      video.src = url
      if (autoPlay) void video.play().catch(() => undefined)
      return () => {
        cancelled = true
        video.pause()
        video.removeAttribute('src')
        video.load()
      }
    }

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      })
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          report(data.type === Hls.ErrorTypes.NETWORK_ERROR ? 'Network error' : 'Playback error')
          hls?.destroy()
        }
      })
      if (autoPlay) {
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          void video.play().catch(() => undefined)
        })
      }
      return () => {
        cancelled = true
        hls?.destroy()
        video.pause()
        video.removeAttribute('src')
        video.load()
      }
    }

    report('HLS not supported in this browser')
    return () => {
      cancelled = true
    }
  }, [autoPlay, camera.streamState.isActive, camera.streamState.url, mode])

  const loading = camera.streamState.isLoading || (mode === null && !error && !camera.isUnavailable)
  const mjpegUrl = mode === 'mjpeg' && camera.streamState.isActive ? camera.streamState.url : null

  if (camera.isUnavailable) {
    return (
      <div
        className={cn(
          'grid aspect-video place-items-center gap-2 rounded-2xl bg-canvas text-ink-faint',
          className,
        )}
      >
        <VideoOff className="size-7 opacity-40" />
        <p className="text-xs">Camera unavailable</p>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={cn(
          'grid aspect-video place-items-center gap-2 rounded-2xl bg-canvas px-4 text-center text-ink-faint',
          className,
        )}
      >
        <VideoOff className="size-7 opacity-40" />
        <p className="text-xs">{error}</p>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-canvas', className)}>
      {loading ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-canvas/80">
          <Loader2 className="size-6 animate-spin text-ink-muted" />
        </div>
      ) : null}
      {mjpegUrl ? (
        <img src={mjpegUrl} alt="Live camera" className="aspect-video w-full object-contain" />
      ) : (
        <video
          ref={videoRef}
          className="aspect-video w-full object-contain"
          playsInline
          muted={muted}
          controls={controls}
          autoPlay={autoPlay}
        />
      )}
    </div>
  )
}
