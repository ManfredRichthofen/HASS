import { useSyncExternalStore } from 'react'

/**
 * Four themes, each with a light and a dark mode. `chrome` is the browser /
 * status-bar colour per mode.
 */
export const themes = [
  {
    id: 'walnut',
    name: 'Walnut',
    description: 'Wood, cream and honey light',
    chrome: { light: '#f5efe4', dark: '#17110d' },
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Flat, precise, amber light',
    chrome: { light: '#f3f3ef', dark: '#111111' },
  },
  {
    id: 'glass',
    name: 'Glass',
    description: 'Frosted glass over soft light',
    chrome: { light: '#e4e5ec', dark: '#0c0f22' },
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    description: 'Raw, ruled, signal yellow',
    chrome: { light: '#e8e6df', dark: '#121212' },
  },
] as const

export type ThemeId = (typeof themes)[number]['id']
export type ModeSetting = 'light' | 'dark' | 'system'
export type Mode = 'light' | 'dark'

export const defaultTheme: ThemeId = 'glass'
export const defaultMode: ModeSetting = 'system'
const THEME_KEY = 'casa.theme'
const MODE_KEY = 'casa.mode'
const DARK_MQ = '(prefers-color-scheme: dark)'

function isThemeId(value: unknown): value is ThemeId {
  return themes.some((t) => t.id === value)
}

function isModeSetting(value: unknown): value is ModeSetting {
  return value === 'light' || value === 'dark' || value === 'system'
}

function read<T>(key: string, check: (v: unknown) => v is T, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return check(value) ? value : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode — the choice still applies for this session */
  }
}

function systemMode(): Mode {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark'
  return window.matchMedia(DARK_MQ).matches ? 'dark' : 'light'
}

type State = { theme: ThemeId; mode: ModeSetting; resolved: Mode }

let state: State | null = null
const listeners = new Set<() => void>()
const serverState: State = { theme: defaultTheme, mode: defaultMode, resolved: 'dark' }

function current(): State {
  if (state) return state
  if (typeof window === 'undefined') return serverState
  const theme = read(THEME_KEY, isThemeId, defaultTheme)
  const mode = read(MODE_KEY, isModeSetting, defaultMode)
  state = { theme, mode, resolved: mode === 'system' ? systemMode() : mode }
  return state
}

/** Applies theme + mode to <html> and the browser chrome colour. */
function apply(next: State) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-theme', next.theme)
  root.setAttribute('data-mode', next.resolved)
  const meta = themes.find((t) => t.id === next.theme)
  const tag = document.querySelector('meta[name="theme-color"]')
  if (meta && tag) tag.setAttribute('content', meta.chrome[next.resolved])
}

function update(patch: Partial<Pick<State, 'theme' | 'mode'>>) {
  const prev = current()
  const mode = patch.mode ?? prev.mode
  state = {
    theme: patch.theme ?? prev.theme,
    mode,
    resolved: mode === 'system' ? systemMode() : mode,
  }
  apply(state)
  for (const listener of listeners) listener()
}

export function setTheme(theme: ThemeId) {
  write(THEME_KEY, theme)
  update({ theme })
}

export function setMode(mode: ModeSetting) {
  write(MODE_KEY, mode)
  update({ mode })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Follow the system while the setting is Auto.
  const mql = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(DARK_MQ) : null
  const onSystem = () => {
    if (current().mode === 'system') update({})
  }
  mql?.addEventListener('change', onSystem)
  return () => {
    listeners.delete(listener)
    mql?.removeEventListener('change', onSystem)
  }
}

export function useAppearance() {
  const s = useSyncExternalStore(subscribe, current, () => serverState)
  return { ...s, setTheme, setMode }
}

/** Kept for existing call sites. */
export function useTheme(): [ThemeId, (id: ThemeId) => void] {
  const { theme } = useAppearance()
  return [theme, setTheme]
}

/**
 * Inline script for <head>: applies the saved theme and mode before first
 * paint so the app never flashes the wrong one. Dependency-free on purpose.
 */
export const themeBootScript = `(function(){var d=document.documentElement;try{var ok=${JSON.stringify(
  themes.map((t) => t.id),
)};var c=${JSON.stringify(Object.fromEntries(themes.map((t) => [t.id, t.chrome])))};var t=localStorage.getItem('${THEME_KEY}');if(ok.indexOf(t)<0)t='${defaultTheme}';var m=localStorage.getItem('${MODE_KEY}');if(m!=='light'&&m!=='dark')m=window.matchMedia&&window.matchMedia('${DARK_MQ}').matches?'dark':'light';d.setAttribute('data-theme',t);d.setAttribute('data-mode',m);var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',c[t][m]);}catch(e){d.setAttribute('data-theme','${defaultTheme}');d.setAttribute('data-mode','dark')}})();`
