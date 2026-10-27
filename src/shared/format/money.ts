const TIYIN_PER_SOM = 100

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/**
 * Formats a tiyin amount for display: `15000000` → `"150 000 so'm"`.
 *
 * The only place money is turned into text. Integer maths only; a leftover
 * tiyin part is shown after a comma (`"150 000,50 so'm"`), which the API
 * should never produce for prices but must not be silently dropped.
 */
export function formatSom(tiyin: number): string {
  if (!Number.isSafeInteger(tiyin)) {
    throw new TypeError(`formatSom expects an integer tiyin amount, got ${tiyin}`)
  }
  const sign = tiyin < 0 ? '-' : ''
  const abs = Math.abs(tiyin)
  const som = Math.floor(abs / TIYIN_PER_SOM)
  const rest = abs % TIYIN_PER_SOM
  const fraction = rest === 0 ? '' : `,${String(rest).padStart(2, '0')}`
  return `${sign}${groupThousands(String(som))}${fraction} so'm`
}
