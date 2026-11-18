/**
 * The thousands separator: a NON-BREAKING space (U+00A0), so a grouped number
 * can never be split across two lines — "12 345 000 soʻm" stays one unit in a
 * narrow card or table cell. Anything parsing a typed amount back must
 * therefore tolerate it; `somInputToTiyin` strips whitespace for that reason.
 */
export const GROUP_SEPARATOR = '\u00A0'

/** Groups an integer with non-breaking spaces, like money: `1203` → `"1 203"`. */
export function formatNumber(value: number): string {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`formatNumber expects an integer, got ${value}`)
  }
  const sign = value < 0 ? '-' : ''
  return sign + String(Math.abs(value)).replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR)
}
