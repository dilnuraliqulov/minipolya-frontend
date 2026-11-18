import { expect, test, type Page } from '@playwright/test'
import { BOOKING_ID, GAME_ID, PAYMENT_ID, STADIUM_ID, USER_ID } from './fixtures/data'
import { installFixtures, signIn } from './fixtures/routes'
import { expectNoOverflow } from './overflow'

/**
 * Every admin route and detail view, at every viewport the config lists, in
 * light and dark: the page must not be wider than the viewport and nothing may
 * spill out of its parent.
 *
 * Run it with `npm run e2e` after ANY change to the admin layout.
 */

function theme(testInfo: { project: { metadata: Record<string, unknown> } }): 'light' | 'dark' {
  return testInfo.project.metadata.theme === 'dark' ? 'dark' : 'light'
}

/** Open `path` and wait for content that only appears once the page rendered. */
async function open(page: Page, path: string, ready: string | RegExp) {
  await page.goto(path)
  // A page that 404s or sits in a skeleton cannot overflow, so a check that
  // did not wait for real content would pass on nothing.
  await expect(page.getByText(ready).first()).toBeVisible({ timeout: 15_000 })
}

const ROUTES: [name: string, path: string, ready: string | RegExp][] = [
  ['overview', '/admin/', /Bosh sahifa|Maydonlar/],
  ['stadiums', '/admin/maydonlar', 'Maydonlar'],
  ['stadium detail', `/admin/maydonlar/${STADIUM_ID}`, 'Maʼlumotlar'],
  ['users', '/admin/foydalanuvchilar', 'Foydalanuvchilar'],
  ['user detail', `/admin/foydalanuvchilar/${USER_ID}`, 'Maʼlumotlar'],
  ['bookings', '/admin/bronlar', 'Bronlar'],
  ['booking panel', `/admin/bronlar?bron=${BOOKING_ID}`, /BRON MAʼLUMOTLARI|Bron/],
  ['games tab', '/admin/bronlar?tab=oyinlar', /Oʻyin/],
  ['game panel', `/admin/bronlar?tab=oyinlar&oyin=${GAME_ID}`, /Oʻyin/],
  ['payments', '/admin/tolovlar', 'Toʻlovlar'],
  ['payment panel', `/admin/tolovlar?tolov=${PAYMENT_ID}`, /Toʻlov/],
  ['journal', '/admin/jurnal', 'Jurnal'],
  ['settings', '/admin/sozlamalar', 'Sozlamalar'],
]

// The login page is the one route that must NOT be signed in: with a token in
// localStorage the guard sends it straight to the dashboard.
test('the login page, signed out', async ({ page }, testInfo) => {
  await installFixtures(page)
  await page.addInitScript((theme) => {
    try {
      localStorage.removeItem('minipolya-admin-token')
      localStorage.setItem('minipolya-admin-theme', theme as string)
    } catch {
      // Storage blocked: the page still renders, in the default theme.
    }
  }, theme(testInfo))
  await open(page, '/admin/login', /Kirish|Parol|Foydalanuvchi/)
  await expectNoOverflow(page, 'login')
})

test.describe('admin layout fits the viewport', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await installFixtures(page)
    await signIn(page, theme(testInfo))
  })

  for (const [name, path, ready] of ROUTES) {
    test(name, async ({ page }) => {
      await open(page, path, ready)
      await expectNoOverflow(page, name)
    })
  }
})

test.describe('states a page load alone never reaches', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await installFixtures(page)
    await signIn(page, theme(testInfo))
  })

  test('an expanded audit row — user detail, stadium detail, Jurnal', async ({ page }) => {
    for (const [label, path, ready] of [
      ['user detail', `/admin/foydalanuvchilar/${USER_ID}`, 'Tarix'],
      ['stadium detail', `/admin/maydonlar/${STADIUM_ID}`, 'Tarix'],
      ['journal', '/admin/jurnal', 'Jurnal'],
    ] as const) {
      await open(page, path, ready)
      // Scoped to `main`: the top bar's account button is also an
      // `aria-expanded` control, and clicking that opens the wrong thing.
      const main = page.locator('main')
      const row = main.getByRole('button', { name: /Batafsil|Yopish/ }).first()
      if (await row.isVisible().catch(() => false)) {
        await row.click()
      } else {
        // On a phone the audit entry is a card: the whole card is the button.
        await main.locator('[aria-expanded="false"]').first().click()
      }
      await expectNoOverflow(page, `${label} — audit row expanded`)
    }
  })

  test('each tab of the user detail page', async ({ page }) => {
    await open(page, `/admin/foydalanuvchilar/${USER_ID}`, 'Maʼlumotlar')
    for (const tab of ['Bronlar', 'Jamoalar', 'Maydonlar']) {
      const button = page.getByRole('tab', { name: new RegExp(tab) })
      if (!(await button.isVisible().catch(() => false))) continue
      await button.click()
      await expectNoOverflow(page, `user detail — ${tab} tab`)
    }
  })

  test('the settings page with unsaved changes', async ({ page }) => {
    await open(page, '/admin/sozlamalar', 'Sozlamalar')
    const field = page.getByLabel('Platforma haqi')
    await field.fill('30000')
    await expect(page.getByRole('region', { name: 'Saqlanmagan oʻzgarishlar' })).toBeVisible()
    await expectNoOverflow(page, 'settings — unsaved changes bar')
  })

  test('the Bloklash reason modal on the user detail page', async ({ page }) => {
    await open(page, `/admin/foydalanuvchilar/${USER_ID}`, 'Qaror')
    const open_ = page.getByRole('button', { name: /Bloklash|Blokdan chiqarish/ }).first()
    await open_.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expectNoOverflow(page, 'user detail — decision modal')
  })

  test('the decision modal on the stadium detail page', async ({ page }) => {
    await open(page, `/admin/maydonlar/${STADIUM_ID}`, 'Qaror')
    const button = page.getByRole('button', { name: /Rad etish|Bloklash|Tasdiqlash/ }).first()
    await button.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expectNoOverflow(page, 'stadium detail — decision modal')
  })
})

test.describe('empty states', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await installFixtures(page, { empty: true })
    await signIn(page, theme(testInfo))
  })

  for (const [name, path, ready] of [
    ['stadiums', '/admin/maydonlar', 'Maydonlar'],
    ['users', '/admin/foydalanuvchilar', 'Foydalanuvchilar'],
    ['bookings', '/admin/bronlar', 'Bronlar'],
    ['payments', '/admin/tolovlar', 'Toʻlovlar'],
    ['journal', '/admin/jurnal', 'Jurnal'],
  ] as const) {
    test(`${name} — empty`, async ({ page }) => {
      await open(page, path, ready)
      await expectNoOverflow(page, `${name} — empty`)
    })
  }
})
