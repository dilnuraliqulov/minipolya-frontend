import { expect, test, type Page } from '@playwright/test'
import { installMiniapp, LONG_FIRST_NAME, UNREAD } from './fixtures/miniapp'
import { expectNoOverflow } from './overflow'

/**
 * Bosh sahifa (the Mini App home) at every viewport the config lists, in light
 * and dark, windowed and in Telegram's fullscreen layout.
 *
 * The header is one row: the search field fills it with the filter button
 * inside it, and the bell ends it — the bell must never take a row of its own,
 * and the placeholder must never be cut off at 360px.
 *
 * Run it with `npm run e2e` after ANY change to the home header.
 */

// The Mini App only ever runs inside Telegram, on a phone: the phone viewports
// the config lists are the ones that mean anything here.
test.skip(({ viewport }) => (viewport?.width ?? 0) > 430, 'the Mini App is a phone app')

function theme(testInfo: { project: { metadata: Record<string, unknown> } }): 'light' | 'dark' {
  return testInfo.project.metadata.theme === 'dark' ? 'dark' : 'light'
}

/** The row that holds the search field. */
function searchRow(page: Page) {
  return page
    .locator('main > div')
    .filter({ has: page.getByRole('searchbox') })
    .first()
}

async function openHome(page: Page, fullscreen: boolean, testInfo: Parameters<typeof theme>[0]) {
  await installMiniapp(page, { theme: theme(testInfo), fullscreen })
  await page.goto('/')
  // A page still in its skeleton cannot overflow, so wait for a real card.
  await expect(page.getByRole('article').first()).toBeVisible({ timeout: 15_000 })
}

for (const fullscreen of [false, true] as const) {
  const where = fullscreen ? 'fullscreen' : 'windowed'

  test.describe(`home — ${where}`, () => {
    test('fits the viewport', async ({ page }, testInfo) => {
      await openHome(page, fullscreen, testInfo)
      await expectNoOverflow(page, `home — ${where}`)
    })

    test('keeps the bell in the search row, with its badge', async ({ page }, testInfo) => {
      await openHome(page, fullscreen, testInfo)
      const row = searchRow(page)
      const bell = row.getByRole('button', { name: /Bildirishnomalar/ })
      await expect(bell).toBeVisible()
      await expect(bell).toContainText(String(UNREAD))

      // One row: the field and the bell share it, on the same line.
      const field = row.getByRole('searchbox')
      const fieldBox = (await field.boundingBox())!
      const bellBox = (await bell.boundingBox())!
      expect(Math.abs(fieldBox.y - bellBox.y)).toBeLessThanOrEqual(8)
      expect(bellBox.x).toBeGreaterThan(fieldBox.x)
      // And nothing else: no second row under the header for it.
      await expect(
        page.getByRole('banner').getByRole('button', { name: /Bildirishnomalar/ }),
      ).toHaveCount(0)
    })

    test('keeps the filter inside the field, and both targets 44px', async ({ page }, testInfo) => {
      await openHome(page, fullscreen, testInfo)
      const row = searchRow(page)
      const filter = row.getByRole('button', { name: 'Filtrlar' })
      const bell = row.getByRole('button', { name: /Bildirishnomalar/ })
      await expect(filter).toBeVisible()

      // Inside the field box, not beside it.
      const fieldBox = (await row.locator('div').first().boundingBox())!
      const filterBox = (await filter.boundingBox())!
      expect(filterBox.x + filterBox.width).toBeLessThanOrEqual(fieldBox.x + fieldBox.width + 1)
      expect(filterBox.x).toBeGreaterThanOrEqual(fieldBox.x)

      for (const [name, box] of [
        ['filter', filterBox],
        ['bell', (await bell.boundingBox())!],
      ] as const) {
        expect(box.width, `${name} touch target`).toBeGreaterThanOrEqual(44)
        expect(box.height, `${name} touch target`).toBeGreaterThanOrEqual(44)
      }
    })

    test('shows the whole placeholder', async ({ page }, testInfo) => {
      await openHome(page, fullscreen, testInfo)
      const input = searchRow(page).getByRole('searchbox')
      await expect(input).toHaveAttribute('placeholder', 'Maydon yoki manzil')
      // An input does not report placeholder overflow, so measure the text.
      const fits = await input.evaluate((el: HTMLInputElement) => {
        const style = getComputedStyle(el)
        const context = document.createElement('canvas').getContext('2d')!
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        return context.measureText(el.placeholder).width <= el.clientWidth
      })
      expect(fits, 'the placeholder is cut off').toBe(true)
    })

    test('ends the date strip with "Boshqa sana", which opens the sheet', async ({
      page,
    }, testInfo) => {
      await openHome(page, fullscreen, testInfo)
      const strip = page.getByRole('radiogroup', { name: 'Sana' })
      await expect(strip.getByRole('radio')).toHaveCount(7)
      const other = strip.getByRole('button', { name: 'Boshqa sana' })
      // Last in the strip: everything else starts to its left.
      const otherBox = (await other.boundingBox())!
      const lastDay = (await strip.getByRole('radio').last().boundingBox())!
      expect(otherBox.x).toBeGreaterThan(lastDay.x)

      await other.scrollIntoViewIfNeeded()
      await other.click()
      const sheet = page.getByRole('dialog', { name: 'Sanani tanlang' })
      await expect(sheet).toBeVisible()
      await expect(sheet.locator('[aria-current="date"]')).toHaveCount(1)
      await expectNoOverflow(page, `home — ${where} — date sheet`)
    })

    test('greets by first name in the header', async ({ page }, testInfo) => {
      await openHome(page, fullscreen, testInfo)
      await expect(page.getByRole('banner').getByRole('heading', { level: 1 })).toHaveText(
        `Salom, ${LONG_FIRST_NAME}`,
      )
    })
  })
}
