import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Fills public/sw.js's precache list with the client entry chunk, its static imports and
 * their CSS — the shell needed before any route renders — and stamps a build id so each
 * deploy gets fresh caches. Runs on the client build only; dev keeps the empty placeholders.
 */
function swPrecache(): Plugin {
  let shell: string[] = []
  return {
    name: 'casa-sw-precache',
    apply: 'build',
    generateBundle(_options, bundle) {
      if (this.environment.name !== 'client') return
      const files = new Set<string>()
      const visit = (fileName: string) => {
        const chunk = bundle[fileName]
        if (chunk?.type !== 'chunk' || files.has(fileName)) return
        files.add(fileName)
        for (const css of chunk.viteMetadata?.importedCss ?? []) files.add(css)
        for (const dep of chunk.imports) visit(dep)
      }
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'chunk' && chunk.isEntry) visit(chunk.fileName)
      }
      shell = [...files].sort().map((file) => `/${file}`)
    },
    writeBundle(options) {
      if (this.environment.name !== 'client' || !options.dir) return
      const swPath = join(options.dir, 'sw.js')
      if (!existsSync(swPath) || shell.length === 0) return
      const buildId = createHash('sha256').update(shell.join(',')).digest('hex').slice(0, 10)
      const sw = readFileSync(swPath, 'utf8')
        .replace(/'dev' \/\* @casa-build-id \*\//, `'${buildId}'`)
        .replace(/\[\] \/\* @casa-precache \*\//, JSON.stringify(shell))
      writeFileSync(swPath, sw)
    },
  }
}

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
      swPrecache(),
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
      // hls.js is ~575 kB and loaded only when a camera stream opens.
      chunkSizeWarningLimit: 600,
    },
  }
})
