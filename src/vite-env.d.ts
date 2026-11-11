/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /** Mini App: the bot's public username, without @ (invite links). */
  /** Yandex Maps JS API v3 (public, restricted by domain). Empty → the Leaflet fallback. */
  readonly VITE_YANDEX_MAPS_API_KEY?: string
  readonly VITE_TELEGRAM_BOT_USERNAME?: string
  /** Mini App: the Mini App's short name from @BotFather (invite links). */
  readonly VITE_TELEGRAM_APP_NAME?: string
  /** Mini App: a public support username, without @ (blocked screen). Optional. */
  readonly VITE_TELEGRAM_SUPPORT_USERNAME?: string
  /** Dev builds only: the backend dev profile's key for the dev sign-in picker. */
  readonly VITE_DEV_LOGIN_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** package.json `version`, set by vite.config.ts `define`. */
declare const __APP_VERSION__: string
