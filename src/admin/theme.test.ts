import { beforeEach, describe, expect, it, vi } from 'vitest'

function mockSystemTheme(dark: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: dark,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

// Fresh module state for every test.
async function loadTheme() {
  vi.resetModules()
  return import('./theme')
}

describe('admin theme', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('follows the computer on the first visit', async () => {
    mockSystemTheme(true)
    const { initAdminTheme } = await loadTheme()
    initAdminTheme()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('toggles and remembers the choice', async () => {
    mockSystemTheme(false)
    const { initAdminTheme, toggleAdminTheme } = await loadTheme()
    initAdminTheme()
    toggleAdminTheme()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('minipolya-admin-theme')).toBe('dark')

    // Next visit: the stored choice wins over the computer's light setting.
    const reloaded = await loadTheme()
    reloaded.initAdminTheme()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('still works when localStorage throws', async () => {
    mockSystemTheme(false)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { initAdminTheme, toggleAdminTheme } = await loadTheme()
    initAdminTheme()
    toggleAdminTheme()
    expect(document.documentElement.dataset.theme).toBe('dark')
    vi.restoreAllMocks()
  })
})
