import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { Segmented } from '#/components/ui/segmented'
import { cn } from '#/lib/cn'
import { type Mode, type ModeSetting, type ThemeId, themes, useAppearance } from '#/lib/theme'

const modes: { value: ModeSetting; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Auto' },
]

const ModeIcon = { light: Sun, dark: Moon, system: Monitor }

/**
 * Appearance: a Light / Dark / Auto switch above the four themes as small live
 * swatches in a single row — everything visible at once, no scrolling.
 */
export function ThemePicker() {
  const { theme, mode, resolved, setTheme, setMode } = useAppearance()
  const Icon = ModeIcon[mode]

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <Icon className="size-5 shrink-0 text-ink-muted" aria-hidden />
        <Segmented
          label="Mode"
          options={modes}
          value={mode}
          onChange={setMode}
          className="flex-1"
        />
      </div>

      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-4 gap-2 @lg:gap-3">
        {themes.map((t) => {
          const selected = theme === t.id
          return (
            // biome-ignore lint/a11y/useSemanticElements: swatch buttons; a native radio cannot hold this layout
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${t.name}: ${t.description}`}
              onClick={() => setTheme(t.id as ThemeId)}
              className="group grid min-w-0 gap-1.5 text-center"
            >
              <span
                className={cn(
                  'relative block rounded-control p-0.5 ring-2 ring-transparent transition-ui',
                  selected ? 'ring-accent' : 'group-hover:ring-border',
                )}
              >
                <Swatch id={t.id as ThemeId} mode={resolved} />
                {selected ? (
                  <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-pill bg-accent text-on-accent">
                    <Check className="size-3" />
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  'truncate text-xs',
                  selected ? 'font-semibold text-ink' : 'font-medium text-ink-muted',
                )}
              >
                {t.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * A tiny screen drawn by the theme itself, in the current mode: a headline and
 * a lit and an unlit tile. Uses explicit per-theme classes (not the theme
 * variants), because those follow the app's theme rather than this scope.
 */
function Swatch({ id, mode }: { id: ThemeId; mode: Mode }) {
  const modern = id === 'modern'
  const brutal = id === 'brutalist'
  const radius = brutal ? 'rounded-none' : 'rounded-[calc(var(--r-card)*0.4)]'
  return (
    <span
      data-theme={id}
      data-mode={mode}
      aria-hidden
      className={cn(
        'pointer-events-none flex aspect-[4/5] flex-col justify-between overflow-hidden bg-canvas p-2 text-left [background-image:var(--grain)]',
        id === 'glass' && 'bg-[var(--c-base)]',
        brutal ? 'rounded-none' : 'rounded-[calc(var(--r-control)*0.8)]',
      )}
    >
      <span className="text-display block text-[0.95rem] leading-none text-ink">Aa</span>
      <span className={cn('grid grid-cols-2', brutal ? 'gap-0' : 'gap-1')}>
        <span
          className={cn(
            'block aspect-square border-ui',
            radius,
            modern
              ? 'border-transparent bg-surface shadow-[inset_0_0_0_1.5px_var(--c-on-to)]'
              : 'bg-on shadow-on',
            brutal ? 'border-ink' : !modern && 'border-transparent',
          )}
        />
        <span
          className={cn(
            'block aspect-square border-ui bg-surface',
            radius,
            modern ? 'border-transparent' : 'border-border-subtle',
            brutal && '-ml-0.5',
          )}
        />
      </span>
    </span>
  )
}
