import { useQueryClient } from '@tanstack/react-query'
import { useHAConnection } from 'hass-react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { notify } from '#/components/ui/toast'
import {
  clearMassAuth,
  consumeMassOAuthReturn,
  discoverMassUrl,
  ensureMassFromHomeAssistant,
  fetchMassAuthProviders,
  hasHomeAssistantProvider,
  loginMassWithHomeAssistant,
  massAuthLabel,
} from '#/lib/massAuth'
import { testMassConnection } from '#/lib/massClient'
import { readMassConfig, suggestedMassUrl, writeMassConfig } from '#/lib/massConfig'

export function MusicAssistantSettings() {
  const queryClient = useQueryClient()
  const { connection, connected: haConnected } = useHAConnection()
  const existing = readMassConfig()
  const [url, setUrl] = useState(existing?.url ?? suggestedMassUrl())
  const [token, setToken] = useState(existing?.token ?? '')
  const [saving, setSaving] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [ensuring, setEnsuring] = useState(false)
  const [connected, setConnected] = useState(Boolean(existing))
  const [authMethod, setAuthMethod] = useState(existing?.authMethod ?? null)
  const [haProviderAvailable, setHaProviderAvailable] = useState(true)
  const [ensureHint, setEnsureHint] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    const consumed = consumeMassOAuthReturn(window.location.search, url)
    if (consumed) {
      setUrl(consumed.url)
      setToken(consumed.token)
      setConnected(true)
      setAuthMethod('ha_oauth')
      void queryClient.invalidateQueries({ queryKey: ['music-queue'] })
      notify('Connected', 'Signed in to Music Assistant with Home Assistant')
    }
  }, [queryClient, url])

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      if (!haConnected || !connection) return
      setEnsuring(true)
      try {
        const result = await ensureMassFromHomeAssistant(connection)
        if (cancelled) return
        if (result.status === 'ready' || result.status === 'already') {
          setUrl(result.config.url)
          setToken(result.config.token)
          setConnected(true)
          setAuthMethod(result.config.authMethod ?? 'ha_integration')
          setEnsureHint(null)
          if (result.status === 'ready') {
            void queryClient.invalidateQueries({ queryKey: ['music-queue'] })
          }
        } else {
          setEnsureHint(result.reason)
          if (!existing?.url) {
            const found = await discoverMassUrl(connection)
            if (!cancelled && found) setUrl(found)
          }
        }
      } finally {
        if (!cancelled) {
          setEnsuring(false)
          setDiscovering(false)
        }
      }
    }
    setDiscovering(true)
    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [connection, existing?.url, haConnected, queryClient])

  useEffect(() => {
    let cancelled = false
    async function checkProviders() {
      const candidate = url.trim()
      if (!candidate) return
      try {
        const providers = await fetchMassAuthProviders(candidate)
        if (!cancelled) setHaProviderAvailable(hasHomeAssistantProvider(providers))
      } catch {
        if (!cancelled) setHaProviderAvailable(true)
      }
    }
    void checkProviders()
    return () => {
      cancelled = true
    }
  }, [url])

  async function signInWithHomeAssistant() {
    const nextUrl = url.trim().replace(/\/+$/, '')
    if (!nextUrl) {
      notify('Missing URL', 'Enter your Music Assistant server URL first')
      return
    }
    if (!haConnected) {
      notify('Home Assistant offline', 'Connect to Home Assistant before signing in')
      return
    }

    setOauthLoading(true)
    try {
      const accessToken = await loginMassWithHomeAssistant(nextUrl)
      writeMassConfig({
        url: nextUrl,
        token: accessToken,
        authMethod: 'ha_oauth',
        obtainedAt: new Date().toISOString(),
      })
      setToken(accessToken)
      setConnected(true)
      setAuthMethod('ha_oauth')
      setEnsureHint(null)
      await queryClient.invalidateQueries({ queryKey: ['music-queue'] })
      notify('Connected', 'Signed in to Music Assistant with Home Assistant')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sign-in failed'
      if (!/Redirecting to Home Assistant/i.test(message)) {
        notify('Sign-in failed', message)
      }
    } finally {
      setOauthLoading(false)
    }
  }

  async function saveManualToken() {
    const nextUrl = url.trim().replace(/\/+$/, '')
    const nextToken = token.trim()
    if (!nextUrl || !nextToken) {
      notify('Missing details', 'URL and access token are required')
      return
    }
    setSaving(true)
    try {
      await testMassConnection(nextUrl, nextToken)
      writeMassConfig({ url: nextUrl, token: nextToken, authMethod: 'token' })
      setConnected(true)
      setAuthMethod('token')
      setEnsureHint(null)
      await queryClient.invalidateQueries({ queryKey: ['music-queue'] })
      notify('Connected', 'Music Assistant API token saved')
    } catch (e) {
      notify('Connection failed', e instanceof Error ? e.message : 'Check URL and token')
    } finally {
      setSaving(false)
    }
  }

  function disconnect() {
    clearMassAuth()
    setToken('')
    setConnected(false)
    setAuthMethod(null)
    void queryClient.invalidateQueries({ queryKey: ['music-queue'] })
    notify('Disconnected', 'Music Assistant credentials cleared')
  }

  const statusLabel = ensuring || discovering
    ? 'Connecting via Home Assistant…'
    : connected
      ? massAuthLabel(authMethod)
      : 'Using Home Assistant get_queue only'

  return (
    <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface p-4">
      <div>
        <p className="text-sm font-semibold text-ink">Music Assistant</p>
        <p className="mt-1 text-xs text-ink-muted">
          Queue list and reorder use the Music Assistant Queue Actions integration when installed.
          Direct Music Assistant API sign-in is only a fallback.
        </p>
      </div>

      <div className="flex min-h-11 items-center justify-between gap-3 text-sm">
        <span className="text-ink-muted">Status</span>
        <span
          className={
            connected ? 'text-right text-success' : ensuring ? 'text-ink-muted' : 'text-right text-ink-faint'
          }
        >
          {ensuring || discovering ? <Loader2 className="inline size-3.5 animate-spin" /> : null}{' '}
          {statusLabel}
        </span>
      </div>

      {ensureHint && !connected ? (
        <p className="text-xs text-ink-muted">{ensureHint}</p>
      ) : null}

      <div className="block space-y-1.5">
        <p className="text-xs font-medium text-ink-muted">Server URL</p>
        <Input
          value={url}
          onValueChange={setUrl}
          placeholder="http://192.168.1.10:8095"
          autoComplete="off"
          spellCheck={false}
          aria-label="Music Assistant server URL"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="accent"
          className="w-full sm:flex-1"
          disabled={oauthLoading || ensuring || !url.trim() || !haProviderAvailable}
          onClick={() => void signInWithHomeAssistant()}
        >
          {oauthLoading ? <Loader2 className="size-4 animate-spin" /> : null}
          {connected && authMethod === 'ha_oauth'
            ? 'Re-sign in with Home Assistant'
            : connected
              ? 'Refresh Home Assistant sign-in'
              : 'Sign in with Home Assistant'}
        </Button>
        {connected ? (
          <Button variant="danger" className="w-full sm:w-auto" onClick={disconnect}>
            Disconnect
          </Button>
        ) : null}
      </div>

      {!haProviderAvailable ? (
        <p className="text-xs text-ink-muted">
          This Music Assistant server does not expose Home Assistant login. Use a long-lived token
          below, or enable the Home Assistant provider in MA.
        </p>
      ) : null}

      <button
        type="button"
        className="flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
        onClick={() => setShowAdvanced((open) => !open)}
      >
        <ChevronDown className={showAdvanced ? 'size-3.5 rotate-180' : 'size-3.5'} />
        Advanced: paste access token
      </button>

      {showAdvanced ? (
        <div className="space-y-3 border-t border-border-subtle pt-3">
          <div className="block space-y-1.5">
            <p className="text-xs font-medium text-ink-muted">Access token</p>
            <Input
              type="password"
              value={token}
              onValueChange={setToken}
              placeholder="Paste long-lived token"
              autoComplete="off"
              spellCheck={false}
              aria-label="Music Assistant access token"
            />
          </div>
          <Button
            variant="secondary"
            className="w-full"
            disabled={saving}
            onClick={() => void saveManualToken()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save token
          </Button>
        </div>
      ) : null}
    </div>
  )
}
