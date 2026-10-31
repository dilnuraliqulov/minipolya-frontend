import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {}
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches
}

/**
 * True when the system asks for reduced motion. Components then leave out
 * movement and entrance animations altogether (not just shorten them), so
 * state changes are instant. Follows the setting live.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
