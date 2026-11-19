/**
 * Warms the dev server's transform cache before the suite runs.
 *
 * Vite transforms a module graph the first time it is asked for it. The suite
 * is `fullyParallel`, so on a cold server every worker asks for the same
 * untransformed graph at the same moment, and that first page load can take far
 * longer than a layout assertion should ever wait for. That is how the Mini App
 * home checks failed while the layout they measure was fine.
 *
 * One load of each entry up front leaves every later load served from cache.
 * It is only an optimisation: if it cannot run, the suite still runs.
 */
import { chromium } from '@playwright/test'

const EMPTY_ENVELOPE = JSON.stringify({ success: true, data: null, message: null })

export default async function warmDevServer(): Promise<void> {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()

    // Nothing here needs a backend or Telegram — only the modules behind them.
    await page.route(
      (url) => url.pathname.startsWith('/api/'),
      (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: EMPTY_ENVELOPE }),
    )
    await page.route(
      (url) => url.hostname === 'telegram.org',
      (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
    )

    for (const path of ['/', '/admin/']) {
      await page.goto(`http://localhost:5173${path}`, {
        waitUntil: 'networkidle',
        timeout: 120_000,
      })
    }
  } catch (error) {
    console.warn(`[e2e] could not warm the dev server: ${String(error)}`)
  } finally {
    await browser.close()
  }
}
