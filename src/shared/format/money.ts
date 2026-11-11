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

/** The nearest whole so'm, still in tiyin, for summaries: `3017499` → `3017500`. */
export function roundToWholeSom(tiyin: number): number {
  return Math.round(tiyin / TIYIN_PER_SOM) * TIYIN_PER_SOM
}

/** Formats a tiyin amount for display: `15000000` → `"150 000 so'm"`. */
export function formatSom(tiyin: number): string {
  const { amount, unit } = formatSomParts(tiyin)
  return `${amount} ${unit}`
}

/**
 * A whole so'm amount the user typed (e.g. a price filter) → tiyin for the
 * API: `150000` → `15000000`. The only so'm → tiyin conversion.
 */
export function somToTiyin(som: number): number {
  if (!Number.isSafeInteger(som) || som < 0) {
    throw new TypeError(`somToTiyin expects a whole, non-negative so'm amount, got ${som}`)
  }
  return som * TIYIN_PER_SOM
}

/**
 * A tiyin amount as the value of a so'm input field, with a dot and no
 * rounding: `12345` → `"123.45"`, `12340` → `"123.4"`, `2500000` → `"25000"`.
 * The inverse of `somInputToTiyin`.
 */
export function tiyinToSomInput(tiyin: number): string {
  if (!Number.isSafeInteger(tiyin) || tiyin < 0) {
    throw new TypeError(`tiyinToSomInput expects a whole, non-negative tiyin amount, got ${tiyin}`)
  }
  const som = Math.floor(tiyin / TIYIN_PER_SOM)
  const fraction = String(tiyin % TIYIN_PER_SOM)
    .padStart(2, '0')
    .replace(/0+$/, '')
  return fraction ? `${som}.${fraction}` : String(som)
}

/**
 * A so'm amount typed with up to two decimals (`"123.45"`, `".5"`, `"12."`)
 * → exact tiyin, by string maths (no floats): `"123.45"` → `12345`.
 */
export function somInputToTiyin(text: string): number {
  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(text)
  if (!match || text === '' || text === '.') {
    throw new TypeError(
      `somInputToTiyin expects a so'm amount with at most two decimals, got "${text}"`,
    )
  }
  const [, whole = '', fraction = ''] = match
  return somToTiyin(Number(whole || '0')) + Number(fraction.padEnd(2, '0'))
}
