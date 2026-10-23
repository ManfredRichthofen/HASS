import { ListMusic } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { cn } from '#/lib/cn'

export function uniqueArtCandidates(...candidates: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue
    seen.add(candidate)
    out.push(candidate)
  }
  return out
}

/** Artwork that tries each candidate URL in order, falling back to an icon. */
export function MediaArt({
  src,
  sources,
  label,
  size = 'md',
  className,
  fallback,
}: {
  src?: string | null | undefined
  /** Tried in order; on error advances to the next candidate. */
  sources?: Array<string | null | undefined>
  label: string
  size?: 'md' | 'hero' | 'fill'
  className?: string
  /** Replaces the default icon when nothing loads. */
  fallback?: ReactNode
}) {
  const candidatesKey = (sources ? uniqueArtCandidates(...sources) : uniqueArtCandidates(src)).join(
    '\n',
  )
  const candidates = useMemo(
    () => (candidatesKey ? candidatesKey.split('\n') : []),
    [candidatesKey],
  )
  const [failed, setFailed] = useState<Set<string>>(() => new Set())
  const activeSrc = candidates.find((candidate) => !failed.has(candidate)) ?? null

  useEffect(() => {
    setFailed(new Set())
  }, [candidatesKey])

  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden bg-surface-hover',
        size === 'hero' &&
          'aspect-square w-full rounded-card bg-on shadow-on brutal:border-2 brutal:border-ink brutal:shadow-[6px_6px_0_var(--c-ink)] glass:rounded-pill glass:ring-[6px] glass:ring-white/70',
        size === 'md' && 'size-12 rounded-control',
        size === 'fill' && 'size-full',
        className,
      )}
    >
      {activeSrc ? (
        <img
          key={activeSrc}
          src={activeSrc}
          alt=""
          className="size-full object-cover"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => {
            setFailed((prev) => new Set(prev).add(activeSrc))
          }}
        />
      ) : (
        (fallback ?? (
          <div
            className={cn(
              'grid size-full place-items-center',
              size === 'hero' ? 'text-on-ink/70' : 'text-ink-faint',
            )}
          >
            <ListMusic className={size === 'hero' ? 'size-14' : 'size-4'} />
          </div>
        ))
      )}
      <span className="sr-only">{label}</span>
    </div>
  )
}
