import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installFakeTelegram, removeFakeTelegram } from '../test/fakeTelegram'
import {
  buildInviteLink,
  getInitData,
  getStartParam,
  getTelegramWebApp,
  haptic,
  initViewport,
  useBackButton,
} from '.'

afterEach(() => {
  removeFakeTelegram()
  vi.unstubAllEnvs()
  document.documentElement.removeAttribute('style')
})

describe('getTelegramWebApp', () => {
  it('is null outside Telegram, where the script reports platform "unknown"', () => {
    installFakeTelegram({ platform: 'unknown' })
    expect(getTelegramWebApp()).toBeNull()
    removeFakeTelegram()
    expect(getTelegramWebApp()).toBeNull()
  })
})

describe('getInitData', () => {
  it('returns the raw initData string, untouched', () => {
    const { webApp } = installFakeTelegram()
    expect(getInitData()).toBe(webApp.initData)
  })

  it('is null outside Telegram or when initData is empty', () => {
    expect(getInitData()).toBeNull()
    installFakeTelegram({ initData: '' })
    expect(getInitData()).toBeNull()
  })
})

describe('getStartParam', () => {
  it('reads start_param from initDataUnsafe', () => {
    installFakeTelegram({ initDataUnsafe: { start_param: 'team_abc' } })
    expect(getStartParam()).toBe('team_abc')
  })

  it('falls back to start_param inside the raw initData string', () => {
    installFakeTelegram({ initDataUnsafe: {}, initData: 'auth_date=1&start_param=game_42&hash=x' })
    expect(getStartParam()).toBe('game_42')
  })

  it('is null when the app was opened without one', () => {
    installFakeTelegram()
    expect(getStartParam()).toBeNull()
  })
})

describe('buildInviteLink', () => {
  it('builds a t.me direct link to the Mini App with startapp', () => {
    vi.stubEnv('VITE_TELEGRAM_BOT_USERNAME', 'MiniPolyaBot')
    vi.stubEnv('VITE_TELEGRAM_APP_NAME', 'app')
    expect(buildInviteLink('team_abc-1')).toBe('https://t.me/MiniPolyaBot/app?startapp=team_abc-1')
  })

  it('rejects a parameter Telegram would not accept (A–Z a–z 0–9 _ -, up to 512)', () => {
    vi.stubEnv('VITE_TELEGRAM_BOT_USERNAME', 'MiniPolyaBot')
    vi.stubEnv('VITE_TELEGRAM_APP_NAME', 'app')
    expect(() => buildInviteLink('a b')).toThrow()
    expect(() => buildInviteLink('')).toThrow()
    expect(() => buildInviteLink('x'.repeat(513))).toThrow()
  })

  it('fails loudly when the bot username or app name is not configured', () => {
    vi.stubEnv('VITE_TELEGRAM_BOT_USERNAME', '')
    vi.stubEnv('VITE_TELEGRAM_APP_NAME', 'app')
    expect(() => buildInviteLink('x')).toThrow('VITE_TELEGRAM_BOT_USERNAME')
  })
})

describe('haptic', () => {
  it('gives light impact feedback inside Telegram', () => {
    const { webApp } = installFakeTelegram()
    haptic.light()
    haptic.success()
    haptic.error()
    expect(webApp.HapticFeedback.impactOccurred).toHaveBeenCalledWith('light')
    expect(webApp.HapticFeedback.notificationOccurred).toHaveBeenCalledWith('success')
    expect(webApp.HapticFeedback.notificationOccurred).toHaveBeenCalledWith('error')
  })

  it('does nothing outside Telegram', () => {
    expect(() => haptic.light()).not.toThrow()
  })
})

describe('initViewport', () => {
  const css = (name: string) => document.documentElement.style.getPropertyValue(name)

  it('calls ready() and expand(), and writes the safe areas as CSS variables', () => {
    const fake = installFakeTelegram({
      safeAreaInset: { top: 44, bottom: 34, left: 0, right: 0 },
      contentSafeAreaInset: { top: 46, bottom: 0, left: 0, right: 0 },
    })
    const cleanup = initViewport()

    expect(fake.webApp.ready).toHaveBeenCalled()
    expect(fake.webApp.expand).toHaveBeenCalled()
    // Device inset + Telegram's own controls on top of it.
    expect(css('--tg-safe-top')).toBe('90px')
    expect(css('--tg-safe-bottom')).toBe('34px')

    fake.webApp.safeAreaInset = { top: 0, bottom: 20, left: 0, right: 0 }
    fake.emit('safeAreaChanged')
    expect(css('--tg-safe-bottom')).toBe('20px')

    cleanup()
    expect(fake.webApp.offEvent).toHaveBeenCalledWith('safeAreaChanged', expect.any(Function))
    expect(fake.webApp.offEvent).toHaveBeenCalledWith(
      'contentSafeAreaChanged',
      expect.any(Function),
    )
  })

  it('leaves the CSS env() fallback alone outside Telegram', () => {
    initViewport()
    expect(css('--tg-safe-top')).toBe('')
  })
})

describe('useBackButton', () => {
  it("shows Telegram's BackButton while mounted and calls the handler on a tap", () => {
    const fake = installFakeTelegram()
    const onBack = vi.fn()
    const { result, unmount } = renderHook(() => useBackButton(onBack))

    expect(result.current).toBe(true)
    expect(fake.webApp.BackButton.show).toHaveBeenCalled()
    act(() => fake.backButton.click())
    expect(onBack).toHaveBeenCalledOnce()

    unmount()
    expect(fake.webApp.BackButton.hide).toHaveBeenCalled()
    expect(fake.backButton.handlerCount()).toBe(0)
  })

  it('reports false outside Telegram, so the screen draws its own back arrow', () => {
    const { result } = renderHook(() => useBackButton(vi.fn()))
    expect(result.current).toBe(false)
  })

  it('does nothing with a null handler', () => {
    const fake = installFakeTelegram()
    renderHook(() => useBackButton(null))
    expect(fake.webApp.BackButton.show).not.toHaveBeenCalled()
  })
})
