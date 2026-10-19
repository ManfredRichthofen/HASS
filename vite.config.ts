import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const host = process.env.TAURI_DEV_HOST

export default defineConfig(({ mode }) => {
  const isTauri =
    Boolean(process.env.TAURI_ENV_PLATFORM) ||
    mode === 'tauri' ||
    process.env.CASA_TAURI_BUILD === '1'

  return {
    clearScreen: false,
    resolve: { tsconfigPaths: true },
    envPrefix: ['VITE_', 'TAURI_ENV_*'],
    plugins: [
      ...(isTauri ? [] : [devtools()]),
      ...(isTauri ? [] : [cloudflare({ viteEnvironment: { name: 'ssr' } })]),
      tailwindcss(),
      tanstackStart(
        isTauri
          ? {
              spa: {
                enabled: true,
                prerender: {
                  outputPath: '/index.html',
                  crawlLinks: false,
                },
              },
            }
          : undefined,
      ),
      viteReact(),
    ],
    server: {
      port: 3000,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: 'ws',
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        ignored: ['**/src-tauri/**'],
      },
    },
    build: {
      // Android System WebView is Chromium-based.
      target: isTauri ? 'chrome105' : undefined,
      // Vite 8 defaults to Oxc; 'esbuild' is deprecated and breaks on es2026.
      minify: process.env.TAURI_ENV_DEBUG ? false : 'oxc',
      sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
    },
  }
})
