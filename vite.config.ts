/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Connect, type Plugin } from 'vite'

const root = import.meta.dirname
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { version: string }

/**
 * Hosts allowed to reach the dev and preview servers by name. Vite refuses any other
 * Host header, which is what stops a stranger's domain pointing at this process.
 * `.up.railway.app` covers the generated domain of a Railway deployment; the tunnels are
 * for testing inside Telegram from a laptop.
 */
const ALLOWED_HOSTS = ['.up.railway.app', '.trycloudflare.com', '.ngrok-free.app']

/**
 * Where the preview server forwards `/api` — including `/api/uploads/**`, the uploaded
 * stadium photos, which is why no second proxy rule is needed. On a platform's private
 * network this is the backend's internal address, e.g.
 * `http://backend.railway.internal:8080`: the backend then needs no public domain and no
 * CORS, because every call the browser makes is same-origin.
 */
const backendUrl = process.env.BACKEND_INTERNAL_URL?.trim() || 'http://localhost:8080'

/**
 * The Content-Security-Policy the preview server sends. Only what the two apps actually
 * load — everything else is refused by the browser.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // 'self': our own bundles. 'unsafe-inline': index.html runs a classic script before the
  // bundle so the first paint uses the saved theme. telegram.org: the Mini App bridge
  // (telegram-web-app.js). The Yandex hosts: the Maps JS API v3 and the further chunks it
  // fetches. 'wasm-unsafe-eval' lets the map renderer compile its WebAssembly — it does
  // not allow eval() of strings.
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://telegram.org " +
    'https://api-maps.yandex.ru https://*.maps.yandex.net',
  // Tailwind and the splash both inject style, and Leaflet's CSS is bundled.
  "style-src 'self' 'unsafe-inline'",
  // data:/blob: are canvas and marker images; the rest are map tiles — Yandex's, and
  // OpenStreetMap's for the Leaflet fallback and the admin panel.
  "img-src 'self' data: blob: https://*.maps.yandex.net https://api-maps.yandex.ru " +
    'https://*.openstreetmap.org https://*.tile.openstreetmap.org',
  "font-src 'self' data:",
  // 'self' is our own API through the proxy below; the Yandex hosts are the map's own calls.
  "connect-src 'self' https://api-maps.yandex.ru https://*.maps.yandex.net",
  // The map renderer runs in a worker it creates from a blob.
  "worker-src 'self' blob:",
  "frame-src 'self'",
  // The Mini App is opened inside Telegram's web clients, and must be embeddable by
  // nobody else. This replaces X-Frame-Options, which cannot name an allowed origin.
  'frame-ancestors https://web.telegram.org https://*.telegram.org https://telegram.org',
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

/** Sent with every preview response. */
const securityHeaders: Record<string, string> = {
  'Content-Security-Policy': contentSecurityPolicy,
  // The platform serves this origin over HTTPS only; say so for a year.
  // No `preload` on purpose: that is a commitment made on a real domain, not a test one.
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  // Cross-origin requests keep the origin in the Referer, which is what the Yandex Maps
  // key is restricted by; the path never leaves the site. `no-referrer` would break the key.
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

/** `/admin`, `/admin/stadiums/…` — a path the admin router handles, not a file. */
function isAdminRoute(path: string): boolean {
  return path === '/admin' || (path.startsWith('/admin/') && !path.includes('.'))
}

/** A document rather than a hashed asset: `/`, `/admin/x`, anything ending in `.html`. */
function isDocument(path: string): boolean {
  return path === '/' || path.endsWith('.html') || !path.slice(1).includes('.')
}

/**
 * Serves admin.html for every /admin/* route, so the admin panel's router
 * works on deep links in dev and preview. Production hosting needs the same
 * rewrite.
 *
 * In preview it also keeps the HTML uncached. The asset file names carry a content
 * hash and may be cached forever, but index.html and admin.html name them, so a
 * cached copy of either would keep loading the previous deploy's bundles.
 */
function adminRoutes(): Plugin {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    const path = req.url?.split('?')[0] ?? ''
    if (isAdminRoute(path)) {
      req.url = '/admin.html'
    }
    next()
  }
  const rewriteAndNoCacheHtml: Connect.NextHandleFunction = (req, res, next) => {
    const path = req.url?.split('?')[0] ?? ''
    if (isDocument(path)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      // The static file server sets its own Cache-Control when it serves the file, which
      // would replace this one. Refuse later writes of that one header, so every document
      // answers the same way whether it was served as a file or through the rewrite above.
      const setHeader = res.setHeader.bind(res)
      res.setHeader = ((name: string, value: number | string | readonly string[]) =>
        name.toLowerCase() === 'cache-control'
          ? res
          : setHeader(name, value)) as typeof res.setHeader
    }
    rewrite(req, res, next)
  }
  return {
    name: 'minipolya-admin-routes',
    configureServer: (server) => {
      server.middlewares.use(rewrite)
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(rewriteAndNoCacheHtml)
    },
  }
}

export default defineConfig({
  plugins: [adminRoutes(), react(), tailwindcss()],
  // The app version shown in Profil and Ilova haqida.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: {
    // In dev the apps call /api on their own origin and Vite forwards it to the
    // local backend, so no CORS is needed.
    proxy: { '/api': 'http://localhost:8080' },
    allowedHosts: ALLOWED_HOSTS,
  },
  // `npm start` (scripts/start-preview.mjs) serves the build with this, on a host's
  // $PORT and every interface. It is what makes one origin enough: the apps are built
  // with VITE_API_URL empty, so they call /api on their own origin, and the proxy below
  // forwards that — uploaded photos (/api/uploads/**) included — to the backend's
  // private address. The backend needs no public domain and no CORS.
  preview: {
    proxy: { '/api': backendUrl },
    allowedHosts: ALLOWED_HOSTS,
    headers: securityHeaders,
  },
  build: {
    rollupOptions: {
      input: {
        miniapp: resolve(root, 'index.html'),
        admin: resolve(root, 'admin.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 15_000,
    // Each worker runs a jsdom page app; one per core (12 here) starves an 8 GB
    // machine until router-level waits time out. A quarter of the cores is enough.
    maxWorkers: '25%',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/test/**',
        'src/admin/test-utils.tsx',
        'src/**/*.d.ts',
      ],
      reporter: ['text-summary', 'json-summary', 'html'],
    },
  },
})
