import { getTelegramWebApp, type SafeAreaInset } from './webApp'

const SIDES = ['top', 'bottom', 'left', 'right'] as const

/**
 * Tells Telegram the app is ready, opens it to full height, and keeps the
 * safe areas in CSS variables: `--tg-safe-top|bottom|left|right` = the
 * device's inset plus Telegram's own controls (contentSafeAreaInset).
 * Outside Telegram the variables stay unset and the CSS falls back to
 * `env(safe-area-inset-*)` (see ../tokens.css). Returns a cleanup.
 */
export function initViewport(): () => void {
  const webApp = getTelegramWebApp()
  if (!webApp) return () => {}

  webApp.ready()
  webApp.expand()

  const sync = () => {
    const zero: SafeAreaInset = { top: 0, bottom: 0, left: 0, right: 0 }
    const device = webApp.safeAreaInset ?? zero
    const content = webApp.contentSafeAreaInset ?? zero
    const style = document.documentElement.style
    for (const side of SIDES) {
      style.setProperty(`--tg-safe-${side}`, `${device[side] + content[side]}px`)
    }
  }
  sync()
  webApp.onEvent('safeAreaChanged', sync)
  webApp.onEvent('contentSafeAreaChanged', sync)
  return () => {
    webApp.offEvent('safeAreaChanged', sync)
    webApp.offEvent('contentSafeAreaChanged', sync)
  }
}
