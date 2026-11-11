import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Page tests render whole pages through the router, waiting on several
// requests; on a busy machine the default 1 s wait is too tight.
configure({ asyncUtilTimeout: 3000 })

// A developer's .env.local must not change what the tests see: no key, so Leaflet.
vi.stubEnv('VITE_YANDEX_MAPS_API_KEY', '')

afterEach(() => {
  cleanup()
})
