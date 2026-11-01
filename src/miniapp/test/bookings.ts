import type { Booking } from '../api/bookings'
import type { SavedCard } from '../api/cards'
import type { Payment } from '../api/payments'

export function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: '018f3a2c-0000-7000-8000-0000000000c1',
    stadiumId: '018f3a2c-0000-7000-8000-0000000000a1',
    stadiumName: 'Bunyodkor Arena',
    userId: '018f3a2c-0000-7000-8000-000000000001',
    source: 'app',
    status: 'confirmed',
    startsAt: '2026-11-06T15:00:00Z',
    endsAt: '2026-11-06T16:00:00Z',
    durationHours: 1,
    price: 15_500_000,
    paidAmount: 15_500_000,
    remainingAmount: 0,
    paymentStatus: 'paid',
    isWalkin: false,
    cancellationPolicy: { cancellationHours: 24 },
    cancellationDeadline: '2026-11-05T15:00:00Z',
    refundIfCancelledNow: 15_500_000,
    createdAt: '2026-11-01T10:00:00Z',
    ...overrides,
  }
}

export function makeCard(overrides: Partial<SavedCard> = {}): SavedCard {
  return {
    id: '018f3a2c-0000-7000-8000-0000000000d1',
    maskedNumber: '8600 •••• 1234',
    cardType: 'uzcard',
    expiry: '12/28',
    isActive: true,
    createdAt: '2026-10-20T10:00:00Z',
    ...overrides,
  }
}

export function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: '018f3a2c-0000-7000-8000-0000000000e1',
    bookingId: '018f3a2c-0000-7000-8000-0000000000c1',
    amount: 15_500_000,
    method: 'card',
    paymentType: 'booking',
    provider: 'atmos',
    status: 'completed',
    createdAt: '2026-11-01T10:00:00Z',
    ...overrides,
  }
}
