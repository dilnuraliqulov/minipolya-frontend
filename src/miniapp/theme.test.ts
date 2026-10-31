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

  it("paints Telegram's header and background in our palette", () => {
    document.documentElement.style.setProperty('--bg', '#ffffff')
    document.documentElement.style.setProperty('--page-bg', '#f7f8fa')
    const fake = installFakeTelegram()
    cleanup = initMiniAppTheme()
    expect(fake.webApp.setHeaderColor).toHaveBeenCalledWith('#ffffff')
    expect(fake.webApp.setBackgroundColor).toHaveBeenCalledWith('#f7f8fa')
    document.documentElement.removeAttribute('style')
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
