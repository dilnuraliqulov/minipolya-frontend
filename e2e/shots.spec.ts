import { expect, test } from '@playwright/test'
import { installMiniapp } from './fixtures/miniapp'

/** TEMPORARY: screenshots of the home header for a visual check. Not committed. */
const DIR =
  'C:/Users/User/AppData/Local/Temp/claude/dba872ae6258dfab/330d7cdf-e154-4265-b31b-993e085b4d7c/scratchpad/shots'

for (const fullscreen of [false, true] as const) {
  test(`home ${fullscreen ? 'fullscreen' : 'windowed'}`, async ({ page }, testInfo) => {
    const theme = testInfo.project.metadata.theme === 'dark' ? 'dark' : 'light'
    await installMiniapp(page, { theme, fullscreen })
    await page.goto('/')
    await expect(page.getByRole('article').first()).toBeVisible({ timeout: 30_000 })
    const name = `${testInfo.project.name}-${fullscreen ? 'fullscreen' : 'windowed'}`
    await page.screenshot({ path: `${DIR}/${name}.png` })

    // And the calendar sheet, open.
    const other = page.getByRole('button', { name: 'Boshqa sana' })
    await other.scrollIntoViewIfNeeded()
    await other.click()
    await expect(page.getByRole('dialog', { name: 'Sanani tanlang' })).toBeVisible()
    await page.screenshot({ path: `${DIR}/${name}-sheet.png` })
  })
}
