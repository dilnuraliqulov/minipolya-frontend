export const TICKS = 3 // intervals above zero: 0, 1/3, 2/3, max

/**
 * The smallest "nice" axis maximum that fits `max`: three equal steps of
 * 1, 2, 2.5, 3, 4, 5, 6 or 8 × 10ⁿ, whole numbers only (counts never get
 * fractional ticks).
 */
export function niceMax(max: number): number {
  if (max <= 0) return TICKS
  const rough = max / TICKS
  const power = 10 ** Math.floor(Math.log10(rough))
  const step =
    [1, 2, 2.5, 3, 4, 5, 6, 8, 10]
      .map((m) => m * power)
      .filter((s) => Number.isInteger(s))
      .find((s) => s >= rough) ?? 10 * power
  return Math.max(step, 1) * TICKS
}

/** Which bars get an x-axis label: every 7th from the first, and the last. */
export function labelledIndexes(count: number): number[] {
  const indexes: number[] = []
  for (let i = 0; i < count - 1; i += 7) {
    if (count - 1 - i >= 4) indexes.push(i)
  }
  if (count > 0) indexes.push(count - 1)
  return indexes
}
