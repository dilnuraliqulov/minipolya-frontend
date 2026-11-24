import { expect, test } from '@playwright/test'
import { STADIUM_ID, USER_ID } from './fixtures/data'
import { installFixtures, signIn } from './fixtures/routes'

/** TEMPORARY: proves the >=1280px layout is the two-column one, unchanged. */
test.describe('desktop structure', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1280, 'desktop only')

  for (const [name, path, asideLabel] of [
    ['user detail', `/admin/foydalanuvchilar/${USER_ID}`, 'Foydalanuvchi'],
    ['stadium detail', `/admin/maydonlar/${STADIUM_ID}`, 'Qaror va egasi'],
  ] as const) {
    test(`${name} keeps its two columns`, async ({ page }, testInfo) => {
      await installFixtures(page)
      await signIn(page, testInfo.project.metadata.theme === 'dark' ? 'dark' : 'light')
      await page.goto(path)
      const aside = page.getByRole('complementary', { name: asideLabel })
      await expect(aside).toBeVisible()
      const box = await aside.boundingBox()
      const main = await page.locator('main').boundingBox()
      console.log(
        `${name}: aside w=${Math.round(box!.width)} x=${Math.round(box!.x)} | main w=${Math.round(main!.width)} right=${Math.round(main!.x + main!.width)}`,
      )
      // The design's 376px aside, pinned to the right of the main column.
      expect(Math.round(box!.width)).toBe(376)
      expect(Math.round(box!.x + box!.width)).toBeLessThanOrEqual(Math.round(main!.x + main!.width))
      // Sticky, as before.
      expect(await aside.evaluate((el) => getComputedStyle(el).position)).toBe('sticky')
    })
  }
})
