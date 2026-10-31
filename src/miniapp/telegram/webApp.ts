/**
 * Typed access to the parts of Telegram's WebApp object the Mini App uses.
 * The official script (telegram-web-app.js) is loaded by index.html only; no
 * community SDK.
 *
 * Nothing read from here is trusted for identity: `initData` is handed to
 * POST /api/auth/telegram as-is, and only the backend's answer counts.
 * `initDataUnsafe` is read for `start_param` only (where to go, not who).
 */

export interface SafeAreaInset {
  top: number
  bottom: number
  left: number
  right: number
}

export type TelegramEvent =
  'themeChanged' | 'safeAreaChanged' | 'contentSafeAreaChanged' | 'viewportChanged'

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: { start_param?: string }
  version: string
  /** "unknown" when the page is opened outside Telegram. */
  platform: string
  colorScheme: 'light' | 'dark'
  /** Bot API 8.0+; undefined on older clients. */
  safeAreaInset?: SafeAreaInset
  contentSafeAreaInset?: SafeAreaInset
  ready(): void
  expand(): void
  isVersionAtLeast(version: string): boolean
  setHeaderColor(color: string): void
  setBackgroundColor(color: string): void
  onEvent(event: TelegramEvent, handler: () => void): void
  offEvent(event: TelegramEvent, handler: () => void): void
  openTelegramLink(url: string): void
  BackButton: {
    isVisible: boolean
    show(): void
    hide(): void
    onClick(handler: () => void): void
    offClick(handler: () => void): void
  }
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
    notificationOccurred(type: 'error' | 'success' | 'warning'): void
    selectionChanged(): void
  }
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

/** The raw, signed initData string for POST /api/auth/telegram, or null outside Telegram. */
export function getInitData(): string | null {
  return getTelegramWebApp()?.initData || null
}

/**
 * The `startapp` parameter the Mini App was opened with (team and game
 * invites), or null. Routing only — never identity.
 */
export function getStartParam(): string | null {
  const webApp = getTelegramWebApp()
  if (!webApp) return null
  const fromUnsafe = webApp.initDataUnsafe?.start_param
  if (fromUnsafe) return fromUnsafe
  return new URLSearchParams(webApp.initData).get('start_param') || null
}
