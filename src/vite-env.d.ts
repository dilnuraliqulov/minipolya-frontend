/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /** Mini App: the bot's public username, without @ (invite links). */
  readonly VITE_TELEGRAM_BOT_USERNAME?: string
  /** Mini App: the Mini App's short name from @BotFather (invite links). */
  readonly VITE_TELEGRAM_APP_NAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
