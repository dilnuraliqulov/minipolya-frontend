import { applyTheme, getSystemTheme, watchSystemTheme } from '../shared/theme/theme'
import { getTelegramWebApp } from './telegram'

/**
 * Mini App theme: our palette, in the light/dark mode the user picked in
 * Telegram, switching live when they change it. Outside Telegram (a normal
 * browser during development) it follows the computer's setting instead.
 *
 * Call once before the first render. Returns a cleanup function.
 */
export function initMiniAppTheme(): () => void {
  const webApp = getTelegramWebApp()

  if (!webApp) {
    applyTheme(getSystemTheme())
    return watchSystemTheme(applyTheme)
  }

  const sync = () => applyTheme(webApp.colorScheme)
  sync()
  webApp.onEvent('themeChanged', sync)
  return () => webApp.offEvent('themeChanged', sync)
}
