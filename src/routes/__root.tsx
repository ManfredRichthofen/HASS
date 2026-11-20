import { ClientOnly, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { AppProviders } from '#/components/AppProviders'
import { AppShell } from '#/components/layout/AppShell'
import { ShellSkeleton } from '#/components/layout/ShellSkeleton'
import { PwaRegister } from '#/components/PwaRegister'
import { perfBootScript } from '#/lib/perf'
import { defaultTheme, themeBootScript, themes } from '#/lib/theme'

import appCss from '../styles.css?url'

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
        content: themes.find((t) => t.id === defaultTheme)?.chrome.dark ?? '#0c0f22',
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
    ],
    scripts: [{ children: themeBootScript }, { children: perfBootScript }],
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
        <ClientOnly fallback={<ShellSkeleton />}>
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
