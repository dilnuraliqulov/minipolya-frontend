/** Input shape helpers for the add-card form. Shape only; the provider decides validity. */

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
