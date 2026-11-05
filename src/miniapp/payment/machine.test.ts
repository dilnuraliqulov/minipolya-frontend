import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api'
import { makeBooking, makePayment } from '../test/bookings'
import { canRetry, isSuccess, runPayment, type PaymentState } from './machine'
import { usePayment } from './usePayment'

const getBooking = vi.fn()
const getMyPayments = vi.fn()
vi.mock('../api/bookings', () => ({
  getBooking: (id: string) => getBooking(id),
}))
vi.mock('../api/payments', () => ({
  getMyPayments: (page?: number) => getMyPayments(page),
}))

type B = ReturnType<typeof makeBooking>

const unpaid = makeBooking({
  status: 'pending',
  paymentStatus: 'unpaid',
  paidAmount: 0,
})
const page = (...content: ReturnType<typeof makePayment>[]) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
})
const sleep = vi.fn(() => Promise.resolve())

beforeEach(() => {
  getBooking.mockReset()
  getMyPayments.mockReset()
  sleep.mockClear()
})

const run = (charge: () => Promise<B>, paymentType: 'booking' | 'remainder' = 'booking') =>
  runPayment(charge, { paymentType, sleep })

describe('runPayment', () => {
  it('paid -> success', async () => {
    const b = makeBooking()
    expect(await run(() => Promise.resolve(b))).toEqual({
      kind: 'success',
      booking: b,
    })
  })

  it('partially_paid -> success', async () => {
    const b = makeBooking({ paymentStatus: 'partially_paid' })
    expect((await run(() => Promise.resolve(b))).kind).toBe('success')
  })

  it('unpaid + failed row -> declined, ignoring another booking', async () => {
    getMyPayments.mockResolvedValue(
      page(
        makePayment({ bookingId: 'other', status: 'completed' }),
        makePayment({ bookingId: unpaid.id, status: 'failed' }),
      ),
    )
    expect(await run(() => Promise.resolve(unpaid))).toEqual({
      kind: 'declined',
      booking: unpaid,
    })
    expect(getBooking).not.toHaveBeenCalled()
  })

  it.each(['INSUFFICIENT_FUNDS', 'CARD_EXPIRED', 'CARD_DECLINED'])(
    'declineReason %s on the booking -> declined with it, no payments lookup',
    async (reason) => {
      const b = makeBooking({
        status: 'pending',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        paymentState: 'declined',
        declineReason: reason,
      })
      expect(await run(() => Promise.resolve(b))).toEqual({
        kind: 'declined',
        booking: b,
        reason,
      })
      expect(getMyPayments).not.toHaveBeenCalled()
      expect(getBooking).not.toHaveBeenCalled()
    },
  )

  it('paymentState failed (no refusal) -> declined without a reason, no lookup', async () => {
    const b = makeBooking({ status: 'pending', paymentStatus: 'unpaid', paymentState: 'failed' })
    expect(await run(() => Promise.resolve(b))).toEqual({ kind: 'declined', booking: b })
    expect(getMyPayments).not.toHaveBeenCalled()
  })

  it('paymentState processing -> polls the booking only, then its declineReason', async () => {
    const processing = makeBooking({
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentState: 'processing',
    })
    const refused = { ...processing, paymentState: 'declined', declineReason: 'INSUFFICIENT_FUNDS' }
    getBooking.mockResolvedValueOnce(processing).mockResolvedValueOnce(refused)
    expect(await run(() => Promise.resolve(processing))).toEqual({
      kind: 'declined',
      booking: refused,
      reason: 'INSUFFICIENT_FUNDS',
    })
    expect(getBooking).toHaveBeenCalledTimes(2)
    expect(getMyPayments).not.toHaveBeenCalled()
  })

  it('another booking failed row is ignored', async () => {
    getMyPayments.mockResolvedValue(page(makePayment({ bookingId: 'other', status: 'failed' })))
    getBooking.mockResolvedValue(unpaid)
    expect((await run(() => Promise.resolve(unpaid))).kind).toBe('checking')
  })

  it('processing -> polls 5 times 3000 ms apart -> checking', async () => {
    getMyPayments.mockResolvedValue(
      page(makePayment({ bookingId: unpaid.id, status: 'processing' })),
    )
    getBooking.mockResolvedValue(unpaid)
    const s = await run(() => Promise.resolve(unpaid))
    expect(s).toEqual({ kind: 'checking', booking: unpaid })
    expect(getBooking).toHaveBeenCalledTimes(5)
    expect(sleep).toHaveBeenCalledTimes(5)
    expect(sleep).toHaveBeenCalledWith(3000)
  })

  it('processing then paid on the 3rd poll -> success, stops', async () => {
    const paid = makeBooking()
    getMyPayments.mockResolvedValue(
      page(makePayment({ bookingId: unpaid.id, status: 'processing' })),
    )
    getBooking
      .mockResolvedValueOnce(unpaid)
      .mockResolvedValueOnce(unpaid)
      .mockResolvedValueOnce(paid)
    expect(await run(() => Promise.resolve(unpaid))).toEqual({
      kind: 'success',
      booking: paid,
    })
    expect(getBooking).toHaveBeenCalledTimes(3)
  })

  it('processing then a failed row appears -> declined', async () => {
    getMyPayments
      .mockResolvedValueOnce(page(makePayment({ bookingId: unpaid.id, status: 'processing' })))
      .mockResolvedValueOnce(page(makePayment({ bookingId: unpaid.id, status: 'processing' })))
      .mockResolvedValue(page(makePayment({ bookingId: unpaid.id, status: 'failed' })))
    getBooking.mockResolvedValue(unpaid)
    const s = await run(() => Promise.resolve(unpaid))
    expect(s.kind).toBe('declined')
    expect(getBooking).toHaveBeenCalledTimes(2)
  })

  it('no payment row -> polls -> checking', async () => {
    getMyPayments.mockResolvedValue(page())
    getBooking.mockResolvedValue(unpaid)
    expect((await run(() => Promise.resolve(unpaid))).kind).toBe('checking')
    expect(getBooking).toHaveBeenCalledTimes(5)
  })

  it('409 -> slotTaken for a booking', async () => {
    const s = await run(() => Promise.reject(new ApiError('x', 409)))
    expect(s).toEqual({ kind: 'slotTaken' })
  })

  it('409 on remainder -> failed(errors.conflict)', async () => {
    const s = await run(() => Promise.reject(new ApiError('x', 409)), 'remainder')
    expect(s).toEqual({ kind: 'failed', errorKey: 'errors.conflict' })
  })

  it('network error -> failed(errors.network)', async () => {
    const s = await run(() => Promise.reject(new ApiError('x', 0)))
    expect(s).toEqual({ kind: 'failed', errorKey: 'errors.network' })
  })

  it('500 -> failed(errors.server)', async () => {
    const s = await run(() => Promise.reject(new ApiError('x', 500)))
    expect(s).toEqual({ kind: 'failed', errorKey: 'errors.server' })
  })

  it('remainder: partially_paid + failed remainder row -> declined', async () => {
    const b = makeBooking({ paymentStatus: 'partially_paid' })
    getMyPayments.mockResolvedValue(
      page(
        makePayment({
          bookingId: b.id,
          paymentType: 'booking',
          status: 'completed',
        }),
        makePayment({
          bookingId: b.id,
          paymentType: 'remainder',
          status: 'failed',
        }),
      ),
    )
    expect((await run(() => Promise.resolve(b), 'remainder')).kind).toBe('declined')
  })

  it('remainder: paid -> success', async () => {
    const b = makeBooking()
    expect((await run(() => Promise.resolve(b), 'remainder')).kind).toBe('success')
  })

  it('stops without further requests once cancelled', async () => {
    getMyPayments.mockResolvedValue(page())
    getBooking.mockResolvedValue(unpaid)
    let cancelled = false
    const s = await runPayment(() => Promise.resolve(unpaid), {
      paymentType: 'booking',
      sleep: () => {
        cancelled = true
        return Promise.resolve()
      },
      isCancelled: () => cancelled,
    })
    expect(s.kind).toBe('checking')
    expect(getBooking).not.toHaveBeenCalled()
  })
})

describe('helpers', () => {
  it('isSuccess', () => {
    expect(isSuccess(makeBooking(), 'booking')).toBe(true)
    expect(isSuccess(makeBooking({ paymentStatus: 'partially_paid' }), 'booking')).toBe(true)
    expect(isSuccess(makeBooking({ paymentStatus: 'partially_paid' }), 'remainder')).toBe(false)
  })

  it('retry is offered only from failed', () => {
    const b = makeBooking()
    const states: PaymentState[] = [
      { kind: 'idle' },
      { kind: 'paying' },
      { kind: 'success', booking: b },
      { kind: 'declined', booking: b },
      { kind: 'checking', booking: b },
      { kind: 'slotTaken' },
      { kind: 'failed', errorKey: 'errors.network' },
    ]
    expect(states.filter(canRetry).map((s) => s.kind)).toEqual(['failed'])
  })
})

describe('usePayment', () => {
  it('ignores a second pay while paying', async () => {
    let resolve!: (b: B) => void
    const charge = vi.fn(() => new Promise<B>((r) => (resolve = r)))
    const { result } = renderHook(() => usePayment())
    let first!: Promise<void>
    act(() => {
      first = result.current.pay(charge, { paymentType: 'booking', sleep })
    })
    await act(async () => {
      await result.current.pay(charge, { paymentType: 'booking', sleep })
    })
    expect(charge).toHaveBeenCalledTimes(1)
    expect(result.current.state.kind).toBe('paying')
    await act(async () => {
      resolve(makeBooking())
      await first
    })
    expect(result.current.state.kind).toBe('success')
    act(() => result.current.reset())
    expect(result.current.state.kind).toBe('idle')
  })
})
