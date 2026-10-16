import { lazy, Suspense } from 'react'
import {
  ClientOnly,
  HeadContent,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { AppProviders } from '#/components/AppProviders'
import { PwaRegister } from '#/components/PwaRegister'
import { AppShell } from '#/components/layout/AppShell'

import appCss from '../styles.css?url'

const fontCss =
  'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Outfit:wght@500;600;700&display=swap'

const Devtools = import.meta.env.DEV
  ? lazy(() =>
      import('#/components/Devtools').then((mod) => ({ default: mod.Devtools })),
    )
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
      { name: 'theme-color', content: '#0e1116' },
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
  }),
  component: AppShell,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ClientOnly
          fallback={
            <div className="root flex min-h-dvh items-center justify-center">
              <div className="size-10 animate-pulse rounded-full bg-accent/30" />
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
