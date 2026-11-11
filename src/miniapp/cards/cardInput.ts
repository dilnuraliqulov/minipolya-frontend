/**
 * Input helpers for the add-card form: shape, the Uzcard / Humo prefix and an
 * expiry that has not passed. These are checks before sending; the provider
 * still decides whether the card is valid.
 */

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/** `8600123456789012` → `8600 1234 5678 9012`. */
export function groupCardNumber(digits: string): string {
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function isCardNumberComplete(digits: string): boolean {
  return /^\d{16}$/.test(digits)
}

/** `MM/YY` with the month 01–12. */
export function isExpiryShape(value: string): boolean {
  return /^(0[1-9]|1[0-2])\/\d{2}$/.test(value)
}

/** Typed or pasted text → `MM` / `MM/Y` / `MM/YY`. */
export function formatExpiry(value: string): string {
  const digits = digitsOnly(value).slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

export type CardBrand = 'uzcard' | 'humo'

/** The two card systems the backend binds, by their first four digits. */
const BRANDS: Record<string, CardBrand> = { '8600': 'uzcard', '9860': 'humo' }

/** `8600…` → uzcard, `9860…` → humo; anything else (or under 4 digits) → null. */
export function cardBrand(digits: string): CardBrand | null {
  return BRANDS[digits.slice(0, 4)] ?? null
}

/**
 * What is wrong with a typed card number, if anything:
 * `brand` as soon as the first four digits are not 8600 / 9860,
 * `length` while it is not 16 digits.
 */
export function cardNumberProblem(digits: string): 'brand' | 'length' | null {
  if (digits.length >= 4 && !cardBrand(digits)) return 'brand'
  if (!isCardNumberComplete(digits)) return 'length'
  return null
}

/**
 * What is wrong with a typed `MM/YY`, if anything: `shape` when it is not a
 * month 01–12 with two year digits, `past` when that month has already ended
 * in Tashkent. A card is valid through the last day of its month, so the
 * current month still passes. `today` is `YYYY-MM-DD` (tashkentToday).
 */
export function expiryProblem(value: string, today: string): 'shape' | 'past' | null {
  if (!isExpiryShape(value)) return 'shape'
  const month = Number(value.slice(0, 2))
  const year = 2000 + Number(value.slice(3, 5))
  const nowYear = Number(today.slice(0, 4))
  const nowMonth = Number(today.slice(5, 7))
  return year * 12 + month < nowYear * 12 + nowMonth ? 'past' : null
}
