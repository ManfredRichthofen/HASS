/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HA_URL: string
  readonly VITE_MA_URL?: string
  readonly VITE_MA_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
