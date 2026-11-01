import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCountdown } from './useCountdown'

const T0 = Date.parse('2026-11-06T15:00:00Z')

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useCountdown', () => {
  it('shows mm:ss and ticks each second', () => {
    let elapsed = 0
    const now = () => T0 + elapsed
    const { result } = renderHook(() => useCountdown('2026-11-06T15:10:00Z', now))
    expect(result.current.label).toBe('10:00')
    expect(result.current.expired).toBe(false)
    act(() => {
      elapsed = 61_000
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.label).toBe('08:59')
    expect(result.current.seconds).toBe(539)
  })

  it('floors at zero', () => {
    const { result } = renderHook(() => useCountdown('2026-11-06T14:00:00Z', () => T0))
    expect(result.current).toEqual({ seconds: 0, label: '00:00', expired: true })
  })

  it('undefined is not expired', () => {
    const { result } = renderHook(() => useCountdown(undefined, () => T0))
    expect(result.current.seconds).toBe(0)
    expect(result.current.expired).toBe(false)
  })
})
