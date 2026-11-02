import { useEffect, type ReactNode } from 'react'

/** The splash stays at least this long after the page started (no flash). */
const MIN_VISIBLE_MS = 400
const FADE_MS = 200

const hiding = new WeakSet<Element>()

/**
 * Fades out and removes the static `#splash` from index.html, no sooner than
 * 400 ms after the page started. Idempotent; a no-op when there is no splash.
 */
export function hideSplash(now: () => number = () => performance.now()): void {
  const el = document.getElementById('splash')
  if (!el || hiding.has(el)) return
  hiding.add(el)
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  setTimeout(
    () => {
      if (reduced) {
        el.remove()
        return
      }
      el.classList.add('splash-out')
      setTimeout(() => el.remove(), FADE_MS)
    },
    Math.max(0, MIN_VISIBLE_MS - now()),
  )
}

/** True while the static splash is still in the page. */
export function hasSplash(): boolean {
  return document.getElementById('splash') !== null
}

/** Hides the splash once `done` is true. */
export function useSplashDone(done: boolean = true): void {
  useEffect(() => {
    if (done) hideSplash()
  }, [done])
}

/** Hides the splash as soon as this screen shows. */
export function SplashDone({ children }: { children: ReactNode }) {
  useSplashDone()
  return children
}
