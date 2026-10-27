/**
 * Applying a colour scheme. The palette itself lives in `tokens.css`; this
 * only flips `data-theme` on <html>, which swaps every token at once.
 */

export type ThemeMode = 'light' | 'dark'

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement
  root.dataset.theme = mode
  // Native form controls and scrollbars follow too.
  root.style.colorScheme = mode
}

export function getAppliedTheme(): ThemeMode {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

/** The computer's light/dark setting. */
export function getSystemTheme(): ThemeMode {
  return darkQuery().matches ? 'dark' : 'light'
}

/** Calls `onChange` whenever the computer's setting changes. Returns an unsubscribe. */
export function watchSystemTheme(onChange: (mode: ThemeMode) => void): () => void {
  const query = darkQuery()
  const listener = (event: MediaQueryListEvent) => onChange(event.matches ? 'dark' : 'light')
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}
