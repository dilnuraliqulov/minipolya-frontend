import { getTelegramWebApp, type SafeAreaInset } from './webApp'

const SIDES = ['top', 'bottom', 'left', 'right'] as const
/** Fullscreen is only requested on phones; desktop and web clients stay windowed. */
const MOBILE = new Set(['android', 'ios'])

/**
 * Tells Telegram the app is ready, opens it to full height (and fullscreen on
 * phones, Bot API 8.0+), stops swipe-down-to-close (7.7+), and keeps the
 * safe areas in CSS variables:
 * - `--tg-safe-top|bottom|left|right` = the device's inset only;
 * - `--tg-content-top` = Telegram's own controls (close / menu) below it.
 * `<html data-fullscreen>` is "true" while the app is fullscreen.
 * Outside Telegram the variables stay unset and the CSS falls back to
 * `env(safe-area-inset-*)` (see ../index.css). Returns a cleanup.
 */
export function initViewport(): () => void {
  const webApp = getTelegramWebApp()
  if (!webApp) return () => {}

  webApp.ready()
  webApp.expand()
  if (webApp.isVersionAtLeast('7.7')) webApp.disableVerticalSwipes?.()
  if (MOBILE.has(webApp.platform) && webApp.isVersionAtLeast('8.0')) {
    try {
      webApp.requestFullscreen?.()
    } catch {
      // Not supported after all: stay windowed.
    }
  }

  const root = document.documentElement
  const syncInsets = () => {
    const zero: SafeAreaInset = { top: 0, bottom: 0, left: 0, right: 0 }
    const device = webApp.safeAreaInset ?? zero
    const content = webApp.contentSafeAreaInset ?? zero
    for (const side of SIDES) root.style.setProperty(`--tg-safe-${side}`, `${device[side]}px`)
    root.style.setProperty('--tg-content-top', `${content.top}px`)
  }
  const syncFullscreen = () => {
    root.dataset.fullscreen = webApp.isFullscreen === true ? 'true' : 'false'
  }
  const onFullscreenFailed = () => {
    root.dataset.fullscreen = 'false'
  }

  syncInsets()
  syncFullscreen()
  webApp.onEvent('safeAreaChanged', syncInsets)
  webApp.onEvent('contentSafeAreaChanged', syncInsets)
  webApp.onEvent('fullscreenChanged', syncFullscreen)
  webApp.onEvent('fullscreenFailed', onFullscreenFailed)
  return () => {
    webApp.offEvent('safeAreaChanged', syncInsets)
    webApp.offEvent('contentSafeAreaChanged', syncInsets)
    webApp.offEvent('fullscreenChanged', syncFullscreen)
    webApp.offEvent('fullscreenFailed', onFullscreenFailed)
  }
}
