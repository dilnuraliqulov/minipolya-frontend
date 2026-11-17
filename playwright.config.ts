import { defineConfig, devices } from '@playwright/test'

/**
 * The admin panel's viewport-overflow check.
 *
 * It stubs every `/api` call with fixtures (see `e2e/fixtures/`), so it needs
 * no backend and no database admin — only the Vite dev server, which it starts
 * itself. Deliberately NOT part of the pre-commit gate: run `npm run e2e`
 * after any change to the admin layout.
 */

export interface ViewportMeta {
  theme: 'light' | 'dark'
}

const SIZES = [
  { name: '360', width: 360, height: 800 },
  { name: '390', width: 390, height: 844 },
  // The tightest case this layout creates: the icon-only sidebar rail is in,
  // and the detail pages are still two columns with a fixed 376px aside.
  { name: '1024', width: 1024, height: 800 },
] as const

const THEMES = ['light', 'dark'] as const

export default defineConfig({
  testDir: 'e2e',
  // A layout assertion must never depend on another test's leftovers.
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: THEMES.flatMap((theme) =>
    SIZES.map((size) => ({
      name: `${size.name}-${theme}`,
      metadata: { theme } satisfies ViewportMeta,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: size.width, height: size.height },
        // The app reads its own localStorage key; this only keeps the browser
        // from fighting it before the first paint.
        colorScheme: theme,
      },
    })),
  ),
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/admin/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
