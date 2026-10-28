import { formatNumber } from './number'

const TIYIN_PER_SOM = 100
const UNIT = "so'm"

/**
 * A tiyin amount split for display: `15000000` → `{ amount: "150 000", unit: "so'm" }`,
 * for layouts that style the number and the unit differently. `formatSom` is
 * the two joined with a space.
 *
 * The only place money is turned into text. Integer maths only; a leftover
 * tiyin part is shown after a comma (`"150 000,50"`), which the API should
 * never produce for prices but must not be silently dropped.
 */
export function formatSomParts(tiyin: number): { amount: string; unit: string } {
  if (!Number.isSafeInteger(tiyin)) {
    throw new TypeError(`formatSom expects an integer tiyin amount, got ${tiyin}`)
  }
  const sign = tiyin < 0 ? '-' : ''
  const abs = Math.abs(tiyin)
  const som = Math.floor(abs / TIYIN_PER_SOM)
  const rest = abs % TIYIN_PER_SOM
  const fraction = rest === 0 ? '' : `,${String(rest).padStart(2, '0')}`
  return { amount: `${sign}${formatNumber(som)}${fraction}`, unit: UNIT }
}

/** Formats a tiyin amount for display: `15000000` → `"150 000 so'm"`. */
export function formatSom(tiyin: number): string {
  const { amount, unit } = formatSomParts(tiyin)
  return `${amount} ${unit}`
}
