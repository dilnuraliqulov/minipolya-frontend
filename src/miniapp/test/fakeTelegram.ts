import { vi } from 'vitest'
import type { TelegramWebApp } from '../telegram/webApp'

type Handler = () => void

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
    isVersionAtLeast: (version: string) => Number(version) <= 8,
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
