import { describe, expect, it } from 'vitest'
import i18n, { resources, setLanguage } from '.'

type Tree = { [key: string]: string | Tree }

function keys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [prefix + key] : keys(value, `${prefix}${key}.`),
  )
}

describe('Mini App translations', () => {
  it('has the same keys in every language', () => {
    const uzKeys = keys(resources.uz.translation).sort()
    expect(keys(resources.ru.translation).sort()).toEqual(uzKeys)
    expect(keys(resources.en.translation).sort()).toEqual(uzKeys)
  })

  it('defaults to Uzbek and switches by profile language', async () => {
    expect(i18n.language).toBe('uz')
    await setLanguage('ru')
    expect(i18n.t('app.tagline')).toBe('Бронируйте футбольные поля в Ташкенте')
    await setLanguage('de')
    expect(i18n.language).toBe('uz')
  })
})
