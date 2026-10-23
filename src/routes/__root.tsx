import { ClientOnly, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { AppProviders } from '#/components/AppProviders'
import { AppShell } from '#/components/layout/AppShell'
import { PwaRegister } from '#/components/PwaRegister'
import { defaultTheme, themeBootScript, themes } from '#/lib/theme'

import appCss from '../styles.css?url'

// Fonts for all three themes: Fraunces (Walnut & Cream), Geist (Walnut & Cream, Modern),
// Space Grotesk + JetBrains Mono (Brutalist), Plus Jakarta Sans (Fluid Glass).
const fontCss =
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Geist:wght@400..700&family=JetBrains+Mono:wght@400..600&family=Space+Grotesk:wght@500..700&family=Plus+Jakarta+Sans:wght@400..700&display=swap'

const Devtools = import.meta.env.DEV
  ? lazy(() => import('#/components/Devtools').then((mod) => ({ default: mod.Devtools })))
  : null

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { title: 'Casa' },
      {
        name: 'description',
        content: 'Home control dashboard',
      },
      {
        name: 'theme-color',
        content: themes.find((t) => t.id === defaultTheme)?.chrome.dark ?? '#17110d',
      },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'Casa' },
      { name: 'application-name', content: 'Casa' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', href: '/icons/icon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      { rel: 'stylesheet', href: fontCss },
    ],
    scripts: [{ children: themeBootScript }],
  }),
  component: AppShell,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme={defaultTheme} data-mode="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ClientOnly
          fallback={
            <div className="root flex min-h-dvh items-center justify-center">
              <div className="size-10 animate-pulse rounded-pill bg-on" />
            </div>
          }
        >
          <AppProviders>
            <PwaRegister />
            <div className="root">{children}</div>
            {Devtools ? (
              <Suspense fallback={null}>
                <Devtools />
              </Suspense>
            ) : null}
          </AppProviders>
        </ClientOnly>
        <Scripts />
      </body>
    </html>
  )
}
