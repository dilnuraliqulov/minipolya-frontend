import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { installFakeTelegram, removeFakeTelegram } from '../test/fakeTelegram'
import {
  buildInviteLink,
  getInitData,
  getStartParam,
  getTelegramWebApp,
  haptic,
  initViewport,
  openExternalLink,
  useBackButton,
} from '.'

afterEach(() => {
  removeFakeTelegram()
  vi.unstubAllEnvs()
  window.history.replaceState(null, '', '/')
  document.documentElement.removeAttribute('style')
  document.documentElement.removeAttribute('data-fullscreen')
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

  it('reads ?startapp= from the URL, also without Telegram', () => {
    window.history.replaceState(null, '', '/?startapp=team_abc')
    expect(getStartParam()).toBe('team_abc')
  })

  it('reads ?tgWebAppStartParam= from the URL', () => {
    window.history.replaceState(null, '', '/?tgWebAppStartParam=x')
    expect(getStartParam()).toBe('x')
  })

  it('prefers initDataUnsafe over the URL', () => {
    installFakeTelegram({ initDataUnsafe: { start_param: 'game_1' } })
    window.history.replaceState(null, '', '/?startapp=team_abc')
    expect(getStartParam()).toBe('game_1')
  })

  it('is null outside Telegram without a URL parameter', () => {
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

describe('openExternalLink', () => {
  it("opens through Telegram's openLink inside Telegram", () => {
    const { webApp } = installFakeTelegram()
    openExternalLink('https://www.openstreetmap.org/')
    expect(webApp.openLink).toHaveBeenCalledWith('https://www.openstreetmap.org/')
  })

  it('opens a new browser tab outside Telegram', () => {
    const open = vi.fn()
    vi.stubGlobal('open', open)
    openExternalLink('https://www.openstreetmap.org/')
    expect(open).toHaveBeenCalledWith('https://www.openstreetmap.org/', '_blank', 'noopener')
    vi.unstubAllGlobals()
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

  it('calls ready() and expand()', () => {
    const fake = installFakeTelegram()
    initViewport()
    expect(fake.webApp.ready).toHaveBeenCalled()
    expect(fake.webApp.expand).toHaveBeenCalled()
  })

  it('writes device and content insets separately', () => {
    const fake = installFakeTelegram({
      safeAreaInset: { top: 47, bottom: 34, left: 0, right: 0 },
      contentSafeAreaInset: { top: 46, bottom: 0, left: 0, right: 0 },
    })
    const cleanup = initViewport()
    expect(css('--tg-safe-top')).toBe('47px')
    expect(css('--tg-safe-bottom')).toBe('34px')
    expect(css('--tg-content-top')).toBe('46px')

    fake.webApp.safeAreaInset = { top: 0, bottom: 20, left: 0, right: 0 }
    fake.webApp.contentSafeAreaInset = { top: 50, bottom: 0, left: 0, right: 0 }
    fake.emit('safeAreaChanged')
    fake.emit('contentSafeAreaChanged')
    expect(css('--tg-safe-bottom')).toBe('20px')
    expect(css('--tg-content-top')).toBe('50px')

    cleanup()
    expect(fake.webApp.offEvent).toHaveBeenCalledWith('safeAreaChanged', expect.any(Function))
    expect(fake.webApp.offEvent).toHaveBeenCalledWith(
      'contentSafeAreaChanged',
      expect.any(Function),
    )
  })

  it.each(['ios', 'android'])(
    'requests fullscreen on %s 8.0, after ready and expand',
    (platform) => {
      const fake = installFakeTelegram({ platform })
      initViewport()
      const { ready, expand, requestFullscreen } = fake.webApp
      expect(requestFullscreen).toHaveBeenCalledTimes(1)
      const at = (fn: unknown) => (fn as Mock).mock.invocationCallOrder[0]!
      expect(at(requestFullscreen)).toBeGreaterThan(at(ready))
      expect(at(requestFullscreen)).toBeGreaterThan(at(expand))
    },
  )

  it.each(['tdesktop', 'macos', 'weba', 'webk'])('stays windowed on %s', (platform) => {
    const fake = installFakeTelegram({ platform })
    initViewport()
    expect(fake.webApp.requestFullscreen).not.toHaveBeenCalled()
  })

  it('stays windowed below 8.0, but still disables vertical swipes', () => {
    const fake = installFakeTelegram({ version: '7.10' })
    initViewport()
    expect(fake.webApp.requestFullscreen).not.toHaveBeenCalled()
    expect(fake.webApp.disableVerticalSwipes).toHaveBeenCalled()
  })

  it('disables vertical swipes from 7.7 and not on 7.6', () => {
    const a = installFakeTelegram({ version: '7.7' })
    initViewport()
    expect(a.webApp.disableVerticalSwipes).toHaveBeenCalledTimes(1)
    const b = installFakeTelegram({ version: '7.6' })
    initViewport()
    expect(b.webApp.disableVerticalSwipes).not.toHaveBeenCalled()
  })

  it('survives requestFullscreen throwing', () => {
    installFakeTelegram({
      requestFullscreen: vi.fn(() => {
        throw new Error('nope')
      }),
    })
    expect(() => initViewport()).not.toThrow()
    expect(document.documentElement.dataset.fullscreen).toBe('false')
  })

  it('marks fullscreen on fullscreenChanged and clears it on fullscreenFailed', () => {
    const fake = installFakeTelegram()
    initViewport()
    expect(document.documentElement.dataset.fullscreen).toBe('false')
    fake.webApp.isFullscreen = true
    fake.emit('fullscreenChanged')
    expect(document.documentElement.dataset.fullscreen).toBe('true')
    fake.emit('fullscreenFailed')
    expect(document.documentElement.dataset.fullscreen).toBe('false')
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

  it('only the top-most screen or sheet handles a tap', () => {
    const fake = installFakeTelegram()
    const screenBack = vi.fn()
    const sheetClose = vi.fn()
    renderHook(() => useBackButton(screenBack))
    const sheet = renderHook(() => useBackButton(sheetClose))

    act(() => fake.backButton.click())
    expect(sheetClose).toHaveBeenCalledOnce()
    expect(screenBack).not.toHaveBeenCalled()

    sheet.unmount()
    expect(fake.webApp.BackButton.isVisible).toBe(true)
    act(() => fake.backButton.click())
    expect(screenBack).toHaveBeenCalledOnce()
  })

  it('does nothing with a null handler', () => {
    const fake = installFakeTelegram()
    renderHook(() => useBackButton(null))
    expect(fake.webApp.BackButton.show).not.toHaveBeenCalled()
  })
})
