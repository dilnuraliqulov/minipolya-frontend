import { describe, expect, it } from 'vitest'
import { availability, MISSING_ENDPOINTS } from './api/missing'

/** Every source file under src, as text: path → contents. */
const SOURCES = import.meta.glob<string>('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** `from '…'`, `import('…')` and `import '…'`. */
const IMPORT = /(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g

describe('the panel shows only real backend data', () => {
  it('has no sample module, and nothing imports one', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(50)
    const offenders = Object.entries(SOURCES).flatMap(([name, text]) => {
      const imports = [...text.matchAll(IMPORT)].map((m) => m[1]!)
      return [
        ...(/sample/i.test(name) ? [name] : []),
        ...imports.filter((path) => /sample/i.test(path)).map((path) => `${name} → ${path}`),
      ]
    })
    expect(offenders).toEqual([])
  })

  it('answers "soon" only for endpoints on the missing list', () => {
    expect(availability('GET /api/admin/payments')).toBe('available')
    MISSING_ENDPOINTS['GET /api/admin/payments'] = 'R16'
    try {
      expect(availability('GET /api/admin/payments')).toBe('soon')
    } finally {
      delete MISSING_ENDPOINTS['GET /api/admin/payments']
    }
  })
})
