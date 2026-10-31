import { afterEach, describe, expect, it } from 'vitest'
import i18n from './i18n'
import { formatLongDate, formatMoney } from './format'

afterEach(async () => {
  await i18n.changeLanguage('uz')
})

describe('formatMoney', () => {
  it('formats tiyin from the API as so‘m with the Uzbek ʻ', () => {
    expect(formatMoney(15_500_000)).toBe('155 000 soʻm')
  })

  it('uses the unit of the current language', async () => {
    await i18n.changeLanguage('ru')
    expect(formatMoney(15_500_000)).toBe('155 000 сум')
  })
})

describe('formatLongDate', () => {
  it('shows the Tashkent date in words, per language', async () => {
    // 21:30 UTC on 30 Oct is already 31 Oct in Tashkent (UTC+5).
    expect(formatLongDate('2026-10-30T21:30:00Z')).toBe('31-oktabr, 2026')
    await i18n.changeLanguage('ru')
    expect(formatLongDate('2026-10-30T21:30:00Z')).toBe('31 октября 2026')
    await i18n.changeLanguage('en')
    expect(formatLongDate('2026-10-30T21:30:00Z')).toBe('31 October 2026')
  })
})
