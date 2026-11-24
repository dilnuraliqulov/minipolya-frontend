import { expect, test, type Page } from '@playwright/test'
import { CHALLENGE, GAME_ID, installMiniapp, MY_TEAM } from './fixtures/miniapp'
import { expectNoOverflow } from './overflow'

/**
 * The screens the team level, the Teams section and the chat changed, at both
 * phone viewports, in light and dark, in **uz and ru** — the two languages the
 * app is actually read in, and the ones whose words differ enough in length to
 * break a row.
 *
 * Every assertion here is about layout: nothing may spill out of the viewport
 * or out of its card, and every target stays 44px. What the screens *do* is
 * covered by the unit tests next to them.
 */

// The Mini App only ever runs inside Telegram, on a phone.
test.skip(({ viewport }) => (viewport?.width ?? 0) > 430, 'the Mini App is a phone app')

// Twelve of these run at once against one dev server, each loading a route the
// warm-up does not cover. On a busy machine the first load of a route can take
// most of the default 30s on its own, and a layout check must never fail for
// that reason.
test.describe.configure({ timeout: 60_000 })

function theme(testInfo: { project: { metadata: Record<string, unknown> } }): 'light' | 'dark' {
  return testInfo.project.metadata.theme === 'dark' ? 'dark' : 'light'
}

/** Every tappable thing on the page is at least 44px tall, as the design requires. */
async function expectTouchTargets(page: Page, where: string) {
  const boxes = await page
    .locator('main button:visible, main a:visible, main [role="radio"]:visible')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect()
        return { height: rect.height, text: (element.textContent ?? '').trim().slice(0, 40) }
      }),
    )
  for (const box of boxes) {
    // A zero-height element is hidden behind something, not a target.
    if (box.height === 0) continue
    expect(
      box.height,
      `${where}: "${box.text}" is only ${box.height}px tall`,
    ).toBeGreaterThanOrEqual(43.5)
  }
}

for (const language of ['uz', 'ru'] as const) {
  test.describe(`teams and chat — ${language}`, () => {
    test('Jamoam fits, with the level, the next game and the stats', async ({ page }, testInfo) => {
      await installMiniapp(page, { theme: theme(testInfo), language, challenges: [CHALLENGE] })
      await page.goto('/team')

      await expect(page.getByRole('heading', { level: 2, name: MY_TEAM.name })).toBeVisible({
        timeout: 15_000,
      })
      await expect(page.getByRole('tab', { name: 'Sergeli Atlas' })).toBeVisible()
      await expectNoOverflow(page, `team — ${language}`)
      await expectTouchTargets(page, `team — ${language}`)
    })

    test('the level banner fits for a team that has none', async ({ page }, testInfo) => {
      await installMiniapp(page, { theme: theme(testInfo), language })
      await page.goto('/team')

      // The second team has no level, and the signed-in player does not lead it,
      // so the banner must not appear — the layout is checked either way.
      await expect(page.getByRole('heading', { level: 2, name: MY_TEAM.name })).toBeVisible({
        timeout: 15_000,
      })
      await page.getByRole('tab', { name: 'Sergeli Atlas' }).click()
      await expect(page.getByRole('heading', { level: 2, name: 'Sergeli Atlas' })).toBeVisible()
      await expectNoOverflow(page, `team (member) — ${language}`)
    })

    test('Jamoa yaratish fits with its three level cards', async ({ page }, testInfo) => {
      await installMiniapp(page, { theme: theme(testInfo), language })
      await page.goto('/team/new')

      await expect(page.getByRole('radiogroup')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByRole('radio')).toHaveCount(3)
      await expectNoOverflow(page, `team/new — ${language}`)
      await expectTouchTargets(page, `team/new — ${language}`)
    })

    test('the challenge board fits with its level chips', async ({ page }, testInfo) => {
      await installMiniapp(page, { theme: theme(testInfo), language, challenges: [CHALLENGE] })
      await page.goto('/challenges')

      await expect(page.getByText(CHALLENGE.waitingTeamName).first()).toBeVisible({
        timeout: 15_000,
      })
      await expectNoOverflow(page, `challenges — ${language}`)
      await expectTouchTargets(page, `challenges — ${language}`)
    })

    test('the chat fits, with both teams in its header and a system line', async ({
      page,
    }, testInfo) => {
      await installMiniapp(page, { theme: theme(testInfo), language })
      await page.goto(`/games/${GAME_ID}/chat`)

      await expect(page.getByRole('list', { name: /Chat|Чат/ })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('Yunusobod United').first()).toBeVisible()
      await expectNoOverflow(page, `chat — ${language}`)
      await expectTouchTargets(page, `chat — ${language}`)
    })

    test('the composer stays above the safe area and the send button is 44px', async ({
      page,
    }, testInfo) => {
      await installMiniapp(page, { theme: theme(testInfo), language })
      await page.goto(`/games/${GAME_ID}/chat`)

      const box = page.getByRole('textbox')
      await expect(box).toBeVisible({ timeout: 15_000 })
      const send = page.locator('footer button, form button[type="submit"]').last()
      const boxRect = (await box.boundingBox())!
      const sendRect = (await send.boundingBox())!

      // One row: the field and the send button share it.
      expect(
        Math.abs(boxRect.y + boxRect.height - (sendRect.y + sendRect.height)),
      ).toBeLessThanOrEqual(8)
      expect(sendRect.height).toBeGreaterThanOrEqual(43.5)
      expect(sendRect.x + sendRect.width).toBeLessThanOrEqual(page.viewportSize()!.width)
    })
  })
}
