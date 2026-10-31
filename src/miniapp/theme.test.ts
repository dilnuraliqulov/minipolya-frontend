import { afterEach, describe, expect, it, vi } from 'vitest'
import { initMiniAppTheme } from './theme'

afterEach(() => {
  delete window.Telegram
  vi.unstubAllGlobals()
})

describe('Mini App theme', () => {
  it("follows Telegram's colour scheme and switches live", () => {
    const handlers: Array<() => void> = []
    const webApp = {
      initData: '',
      colorScheme: 'dark' as 'light' | 'dark',
      platform: 'ios',
      ready: vi.fn(),
      expand: vi.fn(),
      onEvent: (_: 'themeChanged', handler: () => void) => handlers.push(handler),
      offEvent: vi.fn(),
    }
    window.Telegram = { WebApp: webApp }

    const cleanup = initMiniAppTheme()
    expect(document.documentElement.dataset.theme).toBe('dark')

    webApp.colorScheme = 'light'
    handlers.forEach((handler) => handler())
    expect(document.documentElement.dataset.theme).toBe('light')

    cleanup()
    expect(webApp.offEvent).toHaveBeenCalledWith('themeChanged', handlers[0])
  })

  it("falls back to the computer's setting outside Telegram", () => {
    window.Telegram = { WebApp: { platform: 'unknown' } as never }
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    initMiniAppTheme()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
