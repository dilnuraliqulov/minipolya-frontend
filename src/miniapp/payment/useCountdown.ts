import { useEffect, useState } from 'react'

export interface Countdown {
  seconds: number
  /** `mm:ss` */
  label: string
  expired: boolean
}

function remaining(expiresAt: string | undefined, now: number): number {
  if (!expiresAt) return 0
  const end = Date.parse(expiresAt)
  if (Number.isNaN(end)) return 0
  return Math.max(0, Math.floor((end - now) / 1000))
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Seconds left of the hold; never negative, ticks once a second. */
export function useCountdown(
  expiresAt: string | undefined,
  now: () => number = Date.now,
): Countdown {
  // The tick only forces a re-render; the value is always read from the clock.
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!expiresAt) return
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const seconds = remaining(expiresAt, now())

  return {
    seconds,
    label: `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`,
    expired: expiresAt !== undefined && seconds === 0,
  }
}
