import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * The preview server is how the production build is served, so what it forwards, who may
 * reach it and what it sends back are part of the deployment, not a local convenience.
 */
async function loadConfig() {
  vi.resetModules()
  const config = (await import('../../vite.config')).default
  // `defineConfig` with a plain object returns that object.
  if (typeof config === 'function') throw new Error('expected a plain config object')
  return config
}

describe('vite preview config', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    delete process.env.BACKEND_INTERNAL_URL
  })

  it('forwards /api to BACKEND_INTERNAL_URL, uploaded photos included', async () => {
    process.env.BACKEND_INTERNAL_URL = 'http://backend.railway.internal:8080'

    const config = await loadConfig()

    // /api/uploads/** is under /api, so this one rule carries the photos too.
    expect(config.preview?.proxy).toEqual({ '/api': 'http://backend.railway.internal:8080' })
  })

  it('falls back to the local backend when no internal URL is set', async () => {
    const config = await loadConfig()

    expect(config.preview?.proxy).toEqual({ '/api': 'http://localhost:8080' })
  })

  it('allows the generated platform domain by name', async () => {
    const config = await loadConfig()

    expect(config.preview?.allowedHosts).toContain('.up.railway.app')
    expect(config.server?.allowedHosts).toContain('.up.railway.app')
  })

  it('allows the host the platform healthchecks from', async () => {
    // Vite answers 403 to an unlisted Host. Railway's healthcheck comes from
    // healthcheck.railway.app, and a 403 there means the deployment never goes live.
    const config = await loadConfig()

    expect(config.preview?.allowedHosts).toContain('healthcheck.railway.app')
  })

  it('sends the security headers', async () => {
    const headers = (await loadConfig()).preview?.headers as Record<string, string>

    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    // The Yandex Maps key is restricted by Referer, so the origin has to be sent.
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
  })

  it('allows only what the apps load, in the CSP', async () => {
    const headers = (await loadConfig()).preview?.headers as Record<string, string>
    const csp = headers['Content-Security-Policy'] ?? ''
    const directive = (name: string) =>
      csp
        .split('; ')
        .find((part) => part.startsWith(`${name} `))
        ?.slice(name.length + 1) ?? ''

    expect(directive('default-src')).toBe("'self'")
    // Telegram's bridge and the Yandex Maps API, and nothing else off-site.
    expect(directive('script-src')).toContain('https://telegram.org')
    expect(directive('script-src')).toContain('https://api-maps.yandex.ru')
    // Map tiles: Yandex, and OpenStreetMap for the Leaflet fallback and the admin panel.
    expect(directive('img-src')).toContain('https://*.maps.yandex.net')
    expect(directive('img-src')).toContain('https://*.openstreetmap.org')
    // Our own API is same-origin through the proxy.
    expect(directive('connect-src')).toContain("'self'")
    // Embeddable inside Telegram's web clients, by nobody else.
    expect(directive('frame-ancestors')).toBe(
      'https://web.telegram.org https://*.telegram.org https://telegram.org',
    )
    expect(directive('object-src')).toBe("'none'")
    expect(csp).not.toContain("'unsafe-eval'; ")
  })
})
