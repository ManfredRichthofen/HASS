import { spawnSync } from 'node:child_process'

process.env.CASA_TAURI_BUILD = '1'

const result = spawnSync('bunx', ['vite', 'build', '--mode', 'tauri'], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
})

process.exit(result.status ?? 1)
