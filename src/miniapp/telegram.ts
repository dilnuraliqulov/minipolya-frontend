/**
 * The parts of Telegram's WebApp object the Mini App uses. The script
 * (telegram-web-app.js) is loaded by index.html only.
 *
 * Nothing read from here is trusted for identity: `initData` is handed to
 * POST /api/auth/telegram as-is, and only the backend's answer counts.
 */

export interface TelegramWebApp {
  initData: string
  colorScheme: 'light' | 'dark'
  /** "unknown" when the page is opened outside Telegram. */
  platform: string
  ready(): void
  expand(): void
  onEvent(event: 'themeChanged', handler: () => void): void
  offEvent(event: 'themeChanged', handler: () => void): void
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

/** The WebApp object when running inside Telegram, otherwise `null`. */
export function getTelegramWebApp(): TelegramWebApp | null {
  const webApp = window.Telegram?.WebApp
  if (!webApp || webApp.platform === 'unknown') return null
  return webApp
}
