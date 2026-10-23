import { useHAConnection } from 'hass-react'
import { useEffect, useRef } from 'react'

/** Force a full reconnect after the app was backgrounded this long. */
const FORCE_RECONNECT_AFTER_MS = 45_000

/** Give a half-open socket this long to answer ping before reconnecting. */
const PING_TIMEOUT_MS = 4_000

/** Ignore resume events that fire back-to-back (focus + visibility). */
const RESUME_DEBOUNCE_MS = 750

type PingableConnection = {
  ping: () => Promise<unknown>
}

const isPingable = (connection: unknown): connection is PingableConnection =>
  Boolean(
    connection &&
      typeof connection === 'object' &&
      'ping' in connection &&
      typeof (connection as PingableConnection).ping === 'function',
  )

/**
 * After screen-off / backgrounding, hass-react only refreshes the OAuth token
 * when it still thinks the socket is connected. Android often kills the WS
 * without a clean close, leaving a stale "connected" UI.
 *
 * On visibility / online / pageshow resume: reconnect if down, or ping and
 * reconnect if the socket is half-open. Always reconnect after a long hide.
 */
export const useHAResumeReconnect = () => {
  const { connected, connecting, reconnect, connection } = useHAConnection()

  const connectedRef = useRef(connected)
  const connectingRef = useRef(connecting)
  const reconnectRef = useRef(reconnect)
  const connectionRef = useRef(connection)
  const hiddenAtRef = useRef<number | null>(null)
  const lastResumeAtRef = useRef(0)
  const inFlightRef = useRef(false)

  connectedRef.current = connected
  connectingRef.current = connecting
  reconnectRef.current = reconnect
  connectionRef.current = connection

  useEffect(() => {
    if (typeof document === 'undefined') return

    const markHidden = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now()
      }
    }

    const handleResume = () => {
      if (document.visibilityState === 'hidden') return

      const now = Date.now()
      if (now - lastResumeAtRef.current < RESUME_DEBOUNCE_MS) return
      lastResumeAtRef.current = now

      if (connectingRef.current || inFlightRef.current) return

      const hiddenFor = hiddenAtRef.current != null ? now - hiddenAtRef.current : 0
      hiddenAtRef.current = null

      const forceReconnect = hiddenFor >= FORCE_RECONNECT_AFTER_MS
      const isConnected = connectedRef.current
      const conn = connectionRef.current

      if (forceReconnect || !isConnected) {
        inFlightRef.current = true
        try {
          reconnectRef.current()
        } finally {
          // Allow another attempt after debounce window.
          window.setTimeout(() => {
            inFlightRef.current = false
          }, RESUME_DEBOUNCE_MS)
        }
        return
      }

      if (!isPingable(conn)) return

      inFlightRef.current = true
      let settled = false

      const finish = (shouldReconnect: boolean) => {
        if (settled) return
        settled = true
        inFlightRef.current = false
        if (shouldReconnect) reconnectRef.current()
      }

      const timeout = window.setTimeout(() => finish(true), PING_TIMEOUT_MS)

      void conn
        .ping()
        .then(() => {
          window.clearTimeout(timeout)
          finish(false)
        })
        .catch(() => {
          window.clearTimeout(timeout)
          finish(true)
        })
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        markHidden()
        return
      }
      handleResume()
    }

    const handleOnline = () => handleResume()
    const handlePageShow = (event: PageTransitionEvent) => {
      // bfcache restore is a common "wake" path on mobile browsers.
      if (event.persisted) handleResume()
      else if (document.visibilityState === 'visible') handleResume()
    }

    if (document.visibilityState === 'hidden') markHidden()

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('online', handleOnline)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [])
}
