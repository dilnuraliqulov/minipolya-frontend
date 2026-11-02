import { vi } from 'vitest'
import type { TelegramWebApp } from '../telegram/webApp'

type Handler = () => void

/** Compares dotted versions numerically: '7.10' > '7.7'. */
function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/**
 * A stand-in for `window.Telegram.WebApp` in tests. `emit(event)` fires the
 * handlers registered with `onEvent`; `backButton.click()` fires BackButton's.
 */
export function installFakeTelegram(overrides: Partial<TelegramWebApp> = {}) {
  const handlers = new Map<string, Set<Handler>>()
  const backHandlers = new Set<Handler>()

  const webApp = {
    initData: 'query_id=1&user=%7B%22id%22%3A1%7D&auth_date=1&hash=abc',
    initDataUnsafe: {},
    version: '8.0',
    platform: 'ios',
    colorScheme: 'light',
    safeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
    contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
    ready: vi.fn(),
    expand: vi.fn(),
    setHeaderColor: vi.fn(),
    setBackgroundColor: vi.fn(),
    isFullscreen: false,
    requestFullscreen: vi.fn(),
    disableVerticalSwipes: vi.fn(),
    setBottomBarColor: vi.fn(),
    isVersionAtLeast: (wanted: string) => compareVersions(webApp.version, wanted) >= 0,
    onEvent: vi.fn((event: string, handler: Handler) => {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event)!.add(handler)
    }),
    offEvent: vi.fn((event: string, handler: Handler) => {
      handlers.get(event)?.delete(handler)
    }),
    BackButton: {
      isVisible: false,
      show: vi.fn(function (this: { isVisible: boolean }) {
        webApp.BackButton.isVisible = true
      }),
      hide: vi.fn(() => {
        webApp.BackButton.isVisible = false
      }),
      onClick: vi.fn((handler: Handler) => backHandlers.add(handler)),
      offClick: vi.fn((handler: Handler) => backHandlers.delete(handler)),
    },
    HapticFeedback: {
      impactOccurred: vi.fn(),
      notificationOccurred: vi.fn(),
      selectionChanged: vi.fn(),
    },
    openTelegramLink: vi.fn(),
    openLink: vi.fn(),
    ...overrides,
  } as unknown as TelegramWebApp

  window.Telegram = { WebApp: webApp }

  return {
    webApp,
    emit(event: string) {
      handlers.get(event)?.forEach((handler) => handler())
    },
    backButton: {
      click() {
        backHandlers.forEach((handler) => handler())
      },
      handlerCount: () => backHandlers.size,
    },
  }
}

export function removeFakeTelegram() {
  delete window.Telegram
}
