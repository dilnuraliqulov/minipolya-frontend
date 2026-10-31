import { useSyncExternalStore } from 'react'
import { applyTheme, getSystemTheme, watchSystemTheme, type ThemeMode } from '../shared/theme/theme'
import { getTelegramWebApp } from './telegram'

/**
 * Mini App theme: our palette, light or dark.
 *
 * - "system" (Tizim, the default) follows Telegram's colorScheme and switches
 *   live on themeChanged; outside Telegram (a browser in development) it
 *   follows the computer's setting.
 * - "light" / "dark" (Yorugʻ / Qorongʻi, chosen in Profil) override it.
 *
 * The choice is a display preference, kept in localStorage.
 */

export type ThemePreference = 'system' | ThemeMode

export const THEME_STORAGE_KEY = 'minipolya-miniapp-theme'

const listeners = new Set<() => void>()
let reapply: () => void = () => {}

function isPreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function getThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isPreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Storage blocked: the choice still applies for this session.
  }
  reapply()
  listeners.forEach((listener) => listener())
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore((listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, getThemePreference)
}

/** Telegram's own header and background, painted with our tokens. */
function paintTelegramChrome(): void {
  const webApp = getTelegramWebApp()
  if (!webApp) return
  const style = getComputedStyle(document.documentElement)
  const header = style.getPropertyValue('--bg').trim()
  const background = style.getPropertyValue('--page-bg').trim()
  if (header) webApp.setHeaderColor(header)
  if (background) webApp.setBackgroundColor(background)
}

/** Call once before the first render. Returns a cleanup function. */
export function initMiniAppTheme(): () => void {
  const webApp = getTelegramWebApp()
  const systemMode = (): ThemeMode => (webApp ? webApp.colorScheme : getSystemTheme())

  const sync = () => {
    const preference = getThemePreference()
    applyTheme(preference === 'system' ? systemMode() : preference)
    paintTelegramChrome()
  }
  reapply = sync
  sync()

  if (webApp) {
    webApp.onEvent('themeChanged', sync)
    return () => {
      webApp.offEvent('themeChanged', sync)
      reapply = () => {}
    }
  }
  const stopWatching = watchSystemTheme(sync)
  return () => {
    stopWatching()
    reapply = () => {}
  }
}
