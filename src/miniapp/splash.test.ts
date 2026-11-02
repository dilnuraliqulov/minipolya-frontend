import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hideSplash } from './splash'

function addSplash() {
  const el = document.createElement('div')
  el.id = 'splash'
  document.body.appendChild(el)
  return el
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: reduce && query.includes('reduce'), media: query })),
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  stubReducedMotion(false)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.getElementById('splash')?.remove()
})

describe('hideSplash', () => {
  it('waits until 400 ms after start, then fades and removes', () => {
    const el = addSplash()
    hideSplash(() => 100)

    vi.advanceTimersByTime(299)
    expect(el.classList.contains('splash-out')).toBe(false)
    expect(el.isConnected).toBe(true)

    vi.advanceTimersByTime(1)
    expect(el.classList.contains('splash-out')).toBe(true)
    expect(el.isConnected).toBe(true)

    vi.advanceTimersByTime(200)
    expect(el.isConnected).toBe(false)
  })

  it('removes at once after 400 ms with reduced motion', () => {
    stubReducedMotion(true)
    const el = addSplash()
    hideSplash(() => 500)
    vi.advanceTimersByTime(0)
    expect(el.isConnected).toBe(false)
  })

  it('is idempotent', () => {
    addSplash()
    const spy = vi.spyOn(globalThis, 'setTimeout')
    hideSplash(() => 0)
    hideSplash(() => 0)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('does nothing without #splash', () => {
    expect(() => hideSplash(() => 0)).not.toThrow()
    expect(vi.getTimerCount()).toBe(0)
  })
})
