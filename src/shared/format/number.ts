/** Groups an integer with spaces, like money: `1203` → `"1 203"`. */
export function formatNumber(value: number): string {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`formatNumber expects an integer, got ${value}`)
  }
  const sign = value < 0 ? '-' : ''
  return sign + String(Math.abs(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
