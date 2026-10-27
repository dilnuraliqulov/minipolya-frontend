/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_TELEGRAM_BOT_NAME: string
  /** Development only — see CLAUDE.md, "Admin dev login". Never in a production build. */
  readonly VITE_DEV_INIT_DATA?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
