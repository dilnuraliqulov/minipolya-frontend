/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig, type Connect, type Plugin } from 'vite'

const root = import.meta.dirname

/**
 * Serves admin.html for every /admin/* route, so the admin panel's router
 * works on deep links in dev and preview. Production hosting needs the same
 * rewrite.
 */
function adminRoutes(): Plugin {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    const path = req.url?.split('?')[0] ?? ''
    if (path === '/admin' || (path.startsWith('/admin/') && !path.includes('.'))) {
      req.url = '/admin.html'
    }
    next()
  }
  return {
    name: 'minipolya-admin-routes',
    configureServer: (server) => {
      server.middlewares.use(rewrite)
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(rewrite)
    },
  }
}

export default defineConfig({
  plugins: [adminRoutes(), react(), tailwindcss()],
  server: {
    // In dev the apps call /api on their own origin and Vite forwards it to the
    // local backend, so no CORS is needed. Production builds use VITE_API_URL.
    proxy: { '/api': 'http://localhost:8080' },
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
  },
})
