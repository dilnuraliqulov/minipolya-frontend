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
  | 'themeChanged'
  | 'safeAreaChanged'
  | 'contentSafeAreaChanged'
  | 'viewportChanged'
  | 'fullscreenChanged'
  | 'fullscreenFailed'

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
  /** Bot API 8.0+. */
  isFullscreen?: boolean
  ready(): void
  expand(): void
  /** Bot API 8.0+. */
  requestFullscreen?(): void
  /** Bot API 7.7+. */
  disableVerticalSwipes?(): void
  /** Bot API 7.10+. */
  setBottomBarColor?(color: string): void
  isVersionAtLeast(version: string): boolean
  setHeaderColor(color: string): void
  setBackgroundColor(color: string): void
  onEvent(event: TelegramEvent, handler: () => void): void
  offEvent(event: TelegramEvent, handler: () => void): void
  openTelegramLink(url: string): void
  openLink(url: string): void
  /**
   * Bot API 6.9+: asks the user to share their phone with the bot. The
   * callback only says whether they agreed — the number reaches the backend
   * through the bot, never from here.
   */
  requestContact?(callback?: (shared: boolean) => void): void
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
  if (webApp) {
    const fromUnsafe = webApp.initDataUnsafe?.start_param
    if (fromUnsafe) return fromUnsafe
    const fromInitData = new URLSearchParams(webApp.initData).get('start_param')
    if (fromInitData) return fromInitData
  }
  // The bot opens MINIAPP_URL?startapp=<payload> (web_app buttons get no
  // start_param); Telegram's own links use tgWebAppStartParam.
  const query = new URLSearchParams(window.location.search)
  return query.get('startapp') || query.get('tgWebAppStartParam') || null
}
