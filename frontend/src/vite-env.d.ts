/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ID?: string
  readonly VITE_NODE_URL?: string
  readonly VITE_FAUCET_URL?: string
  readonly VITE_DEFAULT_CHAIN?: string
  readonly VITE_HOST_CHAIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
