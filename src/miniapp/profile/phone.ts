/**
 * Uzbek mobile numbers in the profile form: the user types into
 * "+998 XX XXX XX XX"; the API takes `+998XXXXXXXXX` (request R20).
 * Input formatting only — no business rule lives here.
 */

const PREFIX = '+998'
const LOCAL_DIGITS = 9

/** The (up to nine) digits after +998 in whatever the user typed or pasted. */
function localDigits(value: string): string {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('998')) digits = digits.slice(3)
  return digits.slice(0, LOCAL_DIGITS)
}

function group(digits: string): string {
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)]
    .filter(Boolean)
    .join(' ')
}

/** `"+998901"` → `"+998 90 1"`; always starts with `"+998 "`. */
export function formatPhoneInput(value: string): string {
  return `${PREFIX} ${group(localDigits(value))}`
}

export function isCompletePhone(value: string): boolean {
  return localDigits(value).length === LOCAL_DIGITS
}

/** `"+998 90 123 45 67"` → `"+998901234567"` */
export function toWirePhone(value: string): string {
  return PREFIX + localDigits(value)
}

/** A stored `+998XXXXXXXXX` → `"+998 90 123 45 67"`; anything else unchanged. */
export function formatPhone(phone: string): string {
  return /^\+998\d{9}$/.test(phone) ? formatPhoneInput(phone) : phone
}
