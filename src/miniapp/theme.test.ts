import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installFakeTelegram, removeFakeTelegram } from './test/fakeTelegram'
import {
  THEME_STORAGE_KEY,
  getThemePreference,
  initMiniAppTheme,
  setThemePreference,
  useThemePreference,
} from './theme'

const applied = () => document.documentElement.dataset.theme

let cleanup: () => void = () => {}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  cleanup = () => {}
  removeFakeTelegram()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Mini App theme', () => {
  it('"Tizim" (the default) follows Telegram\'s colour scheme and switches live', () => {
    const fake = installFakeTelegram({ colorScheme: 'dark' })
    cleanup = initMiniAppTheme()
    expect(getThemePreference()).toBe('system')
    expect(applied()).toBe('dark')

    fake.webApp.colorScheme = 'light'
    fake.emit('themeChanged')
    expect(applied()).toBe('light')
  })

  it('"Yorugʻ" / "Qorongʻi" override Telegram and are remembered', () => {
    const fake = installFakeTelegram({ colorScheme: 'dark' })
    cleanup = initMiniAppTheme()

    setThemePreference('light')
    expect(applied()).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')

    // Telegram switching does not undo an explicit choice.
    fake.webApp.colorScheme = 'dark'
    fake.emit('themeChanged')
    expect(applied()).toBe('light')

    setThemePreference('system')
    expect(applied()).toBe('dark')
  })

  it('starts from the stored choice', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    installFakeTelegram({ colorScheme: 'light' })
    cleanup = initMiniAppTheme()
    expect(applied()).toBe('dark')
  })

  it('ignores a stored value it does not know', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'purple')
    expect(getThemePreference()).toBe('system')
  })

  describe("Telegram's chrome", () => {
    beforeEach(() => {
      document.documentElement.style.setProperty('--bar-bg', '#ffffff')
      document.documentElement.style.setProperty('--page-bg', '#f7f8fa')
    })
    afterEach(() => {
      document.documentElement.removeAttribute('style')
    })

    it('paints header/background/bottom bar from tokens', () => {
      const fake = installFakeTelegram()
      cleanup = initMiniAppTheme()
      expect(fake.webApp.setHeaderColor).toHaveBeenCalledWith('#ffffff')
      expect(fake.webApp.setBackgroundColor).toHaveBeenCalledWith('#f7f8fa')
      expect(fake.webApp.setBottomBarColor).toHaveBeenCalledWith('#ffffff')
    })

    it('repaints on themeChanged', () => {
      const fake = installFakeTelegram()
      cleanup = initMiniAppTheme()
      document.documentElement.style.setProperty('--bar-bg', '#000000')
      fake.emit('themeChanged')
      expect(fake.webApp.setHeaderColor).toHaveBeenLastCalledWith('#000000')
      expect(fake.webApp.setBottomBarColor).toHaveBeenLastCalledWith('#000000')
    })

    it('repaints when Mavzu changes', () => {
      const fake = installFakeTelegram()
      cleanup = initMiniAppTheme()
      vi.mocked(fake.webApp.setHeaderColor).mockClear()
      setThemePreference('dark')
      expect(fake.webApp.setHeaderColor).toHaveBeenCalledTimes(1)
      expect(fake.webApp.setBackgroundColor).toHaveBeenCalled()
    })

    it('skips setBottomBarColor before 7.10', () => {
      const fake = installFakeTelegram({ version: '7.9' })
      cleanup = initMiniAppTheme()
      expect(fake.webApp.setHeaderColor).toHaveBeenCalledWith('#ffffff')
      expect(fake.webApp.setBottomBarColor).not.toHaveBeenCalled()
    })
  })

  it("falls back to the computer's setting outside Telegram", () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    cleanup = initMiniAppTheme()
    expect(applied()).toBe('dark')
  })

  it('exposes the choice to React', () => {
    installFakeTelegram()
    cleanup = initMiniAppTheme()
    const { result } = renderHook(() => useThemePreference())
    expect(result.current).toBe('system')
    act(() => setThemePreference('dark'))
    expect(result.current).toBe('dark')
  })
})
