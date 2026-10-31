import { useSyncExternalStore } from 'react'
import {
  applyTheme,
  getAppliedTheme,
  getSystemTheme,
  isThemeMode,
  watchSystemTheme,
  type ThemeMode,
} from '../shared/theme/theme'

/**
 * Admin panel theme: the first visit follows the computer's setting; once the
 * admin toggles, that choice is remembered in this browser.
 */

const STORAGE_KEY = 'minipolya-admin-theme'

const listeners = new Set<() => void>()
let stopWatchingSystem: (() => void) | null = null

function readStoredTheme(): ThemeMode | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isThemeMode(value) ? value : null
  } catch {
    return null
  }
}

function storeTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // Not remembered across reloads; the toggle still works for this session.
  }
}

function setTheme(mode: ThemeMode): void {
  applyTheme(mode)
  listeners.forEach((listener) => listener())
}

/** Call once before the first render. */
export function initAdminTheme(): void {
  const stored = readStoredTheme()
  setTheme(stored ?? getSystemTheme())
  if (!stored) {
    // No choice made yet: keep following the computer until there is one.
    stopWatchingSystem = watchSystemTheme(setTheme)
  }
}

/** The admin's explicit choice; remembered from now on. */
export function setAdminTheme(mode: ThemeMode): void {
  stopWatchingSystem?.()
  stopWatchingSystem = null
  storeTheme(mode)
  setTheme(mode)
}

export function toggleAdminTheme(): void {
  setAdminTheme(getAppliedTheme() === 'dark' ? 'light' : 'dark')
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAdminTheme(): ThemeMode {
  return useSyncExternalStore(subscribe, getAppliedTheme)
}
