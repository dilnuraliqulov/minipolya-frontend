import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CARD_ROWS, COMPACT_NAV, RAIL_NAV, useMediaQuery } from './useMediaQuery'

/** A fake `matchMedia` for one query whose `matches` can be flipped live. */
function fakeMatchMedia(initial: boolean) {
  const listeners = new Set<() => void>()
  let matches = initial
  vi.stubGlobal('matchMedia', (media: string) => ({
    media,
    get matches() {
      return matches
    },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }))
  return (next: boolean) => {
    matches = next
    listeners.forEach((listener) => listener())
  }
}

describe('useMediaQuery', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('answers false and does not throw when matchMedia is missing', () => {
    vi.stubGlobal('matchMedia', undefined)
    const { result } = renderHook(() => useMediaQuery(CARD_ROWS))
    expect(result.current).toBe(false)
  })

  it('answers the query and follows a change', () => {
    const flip = fakeMatchMedia(true)
    const { result } = renderHook(() => useMediaQuery(CARD_ROWS))
    expect(result.current).toBe(true)
    act(() => flip(false))
    expect(result.current).toBe(false)
  })

  it('stops listening when the component goes away', () => {
    const flip = fakeMatchMedia(false)
    const { unmount } = renderHook(() => useMediaQuery(CARD_ROWS))
    unmount()
    // Nothing is subscribed any more, so this must not reach a torn-down hook.
    expect(() => flip(true)).not.toThrow()
  })

  it('names the three breakpoints the admin panel switches at', () => {
    expect(CARD_ROWS).toBe('(max-width: 767px)')
    expect(COMPACT_NAV).toBe('(max-width: 1023px)')
    expect(RAIL_NAV).toBe('(min-width: 1024px) and (max-width: 1279px)')
  })
})
