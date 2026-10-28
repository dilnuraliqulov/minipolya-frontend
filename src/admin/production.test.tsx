/**
 * The panel as a production build sees it: sample data switched off. Missing
 * endpoints must show "Tez orada" or nothing — never made-up values.
 */
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { availability, MISSING_ENDPOINTS, NotAvailableError, viaSample } from './api/missing'
import { mockBackend, type Reply, renderAt, signIn, stats, useAdminTestSetup } from './test-utils'

vi.mock('./api/sample', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api/sample')>()),
  SHOW_SAMPLE_DATA: false,
}))

const overviewReplies: Record<string, Reply> = {
  '/api/admin/stats': [200, stats],
  '/api/admin/stats/revenue': [200, { dailyRevenue: [] }],
  '/api/admin/stadiums': [200, { content: [], page: 0, size: 1, totalElements: 0, totalPages: 0 }],
}

describe('production build (no sample data)', () => {
  useAdminTestSetup()

  it('marks every missing endpoint as "Tez orada" and never calls the adapter', async () => {
    for (const endpoint of Object.keys(MISSING_ENDPOINTS)) {
      expect(availability(endpoint)).toBe('soon')
    }
    const real = vi.fn()
    const sample = vi.fn()
    const endpoint = Object.keys(MISSING_ENDPOINTS)[0]!
    await expect(viaSample(endpoint, real, sample)).rejects.toBeInstanceOf(NotAvailableError)
    expect(real).not.toHaveBeenCalled()
    expect(sample).not.toHaveBeenCalled()
  })

  it('shows no sample values on the overview: no comparisons, no failed-refund tile or badge', async () => {
    const { requests } = mockBackend({ ...overviewReplies })
    signIn()
    renderAt('/')
    expect(await screen.findByText('47')).toBeInTheDocument()
    expect(screen.queryByText('Namuna')).not.toBeInTheDocument()
    expect(screen.queryByText('Muvaffaqiyatsiz qaytarishlar')).not.toBeInTheDocument()
    expect(screen.getByText('Yangi maydonlar')).toBeInTheDocument()
    const menu = screen.getByRole('navigation', { name: 'Asosiy menyu' })
    expect(within(menu).getByRole('link', { name: 'Toʻlovlar' })).toBeInTheDocument()
    // Only real endpoints were called.
    expect(requests.every((r) => r.url.pathname.startsWith('/api/admin/'))).toBe(true)
  })
})
