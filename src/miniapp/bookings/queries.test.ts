import { describe, expect, it } from 'vitest'
import { PROCESSING_POLL_MS, pollWhileProcessing } from './queries'

describe('polling a booking whose payment is being checked', () => {
  it('reads it again every few seconds while it is processing', () => {
    expect(pollWhileProcessing({ paymentState: 'processing' })).toBe(PROCESSING_POLL_MS)
  })

  it('stops as soon as the payment is settled, and never polls anything else', () => {
    for (const paymentState of ['paid', 'declined', 'failed', 'none', undefined]) {
      expect(pollWhileProcessing({ paymentState })).toBe(false)
    }
    expect(pollWhileProcessing(undefined)).toBe(false)
  })
})
