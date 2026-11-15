import { useCallback, useSyncExternalStore } from 'react'

/**
 * The three widths the admin panel switches at. Everything that only *looks*
 * different uses Tailwind's `max-md:` / `lg:` / `xl:` variants; these queries
 * are for the places that must *render* something else, so the DOM never
 * carries two copies of the same content.
 *
 * Nothing changes at or above 1280px — that is today's desktop layout.
 */

/** Table rows become cards and the filters move into a bottom sheet. */
export const CARD_ROWS = '(max-width: 767px)'
/** The sidebar is replaced by a top bar with a navigation drawer. */
export const COMPACT_NAV = '(max-width: 1023px)'
/** The sidebar is a narrow icon-only rail with tooltips. */
export const RAIL_NAV = '(min-width: 1024px) and (max-width: 1279px)'

/**
 * Whether the viewport matches `query`, following it live. Answers `false`
 * where `matchMedia` is missing (jsdom, very old browsers), so the panel falls
 * back to the desktop layout instead of failing.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    [query],
  )
  const getSnapshot = useCallback(
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    [query],
  )
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
