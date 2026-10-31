import { formatSomParts, toTashkentParts } from '../shared/format'
import i18n from './i18n'

/**
 * Mini App display formats in the current language. Conversions stay in
 * shared/format (tiyin → so'm, UTC → Asia/Tashkent); only the words differ.
 */

/** Tiyin from the API → `"155 000 soʻm"` (`"155 000 сум"`, `"155 000 UZS"`). */
export function formatMoney(tiyin: number): string {
  return `${formatSomParts(tiyin).amount} ${i18n.t('money.unit')}`
}

const MONTH_KEYS = [
  'months.jan',
  'months.feb',
  'months.mar',
  'months.apr',
  'months.may',
  'months.jun',
  'months.jul',
  'months.aug',
  'months.sep',
  'months.oct',
  'months.nov',
  'months.dec',
] as const

/** A UTC timestamp → its Tashkent date in words: `"31-oktabr, 2026"`. */
export function formatLongDate(value: string | Date): string {
  const { day, month, year } = toTashkentParts(value)
  const monthKey = MONTH_KEYS[month - 1] ?? MONTH_KEYS[0]
  return i18n.t('format.longDate', { day, month: i18n.t(monthKey), year })
}
