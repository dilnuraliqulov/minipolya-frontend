import { api, type Page } from '../../shared/api'
import { getAuditLog, type AuditEntry } from './audit'
import { isSampleId, loadSampleAdapter, viaSample } from './missing'

/**
 * Payments for the admin panel — requests R16 (list, detail, period summary)
 * and R17 (refunds that can fail, retry, mark as refunded by hand). The
 * backend stores all of it in `payments` but has no admin endpoint; the
 * shapes follow the `Payment` entity.
 */

/** `AdminPaymentResponse` (R16). Money in tiyin; a refund's amounts are negative. */
export interface AdminPayment {
  id: string
  /** UTC. */
  createdAt: string
  userId?: string
  userName?: string
  userPhone?: string
  /** `booking` | `remainder` | `team_game` | `game_share` | `service_fee` | `refund`. */
  paymentType: string
  stadiumId?: string
  stadiumName?: string
  bookingId?: string
  gameId?: string
  amount: number
  ownerAmount: number
  platformAmount: number
  /** The booking commission in force when the payment was taken. */
  commissionPercent: number
  /** `card` | `cash`. */
  method: string
  /** `atmos` | `payme` | `click` | `cash`. */
  provider: string
  /** The provider's transaction id; absent for cash. */
  providerTxnId?: string
  /** A `payment.status` value (§1.9). */
  status: string
  refundReason?: string
  /** For a refund: the payment it gives back. */
  refundOfPaymentId?: string
  /** For a failed refund (R17): the provider's error, as it sent it. */
  failureReason?: string
  /** R17: an admin marked this refund as paid back outside the platform. */
  refundedManually?: boolean
  manualRefundReason?: string
}

/** A payment linked to another: a refund's original, or an original's refunds. */
export interface LinkedPayment {
  id: string
  paymentType: string
  amount: number
  status: string
  method: string
  providerTxnId?: string
  createdAt: string
}

export interface AdminPaymentDetail extends AdminPayment {
  linkedPayments: LinkedPayment[]
}

/** `AdminPaymentSummaryResponse` (R16) — one period, all tiyin, computed by the backend. */
export interface PaymentSummary {
  /** Card payments kept through the app (cash not included). */
  appRevenue: number
  /** The platform's share of those. */
  platformRevenue: number
  /** The owners' share of those. */
  ownerPayouts: number
  /** Refunded in the period (a positive amount). */
  refunded: number
  /** Currently held, not yet captured or released. */
  held: number
}

export type PaymentTab = 'all' | 'refunds' | 'held'

export interface PaymentFilters {
  tab: PaymentTab
  /** Payer name, phone or provider transaction id. */
  search?: string
  type?: string
  status?: string
  method?: string
  stadiumId?: string
  /** Tashkent `LocalDate`s on `createdAt`, both inclusive. */
  from?: string
  to?: string
  page?: number
  size?: number
}

export const PAYMENTS_LIST = 'GET /api/admin/payments'
export const PAYMENT_DETAIL = 'GET /api/admin/payments/{id}'
export const PAYMENTS_SUMMARY = 'GET /api/admin/payments/summary'
export const REFUND_RETRY = 'POST /api/admin/payments/{id}/retry-refund'
export const REFUND_MANUAL = 'POST /api/admin/payments/{id}/mark-refunded'

/**
 * The tabs are filters: Qaytarishlar is `type=refund` (the backend lists failed
 * ones first), Ushlab turilgan is `status=held`.
 */
function query(filters: PaymentFilters) {
  const { tab, search, ...rest } = filters
  return {
    ...rest,
    search: search?.trim() || undefined,
    type: tab === 'refunds' ? 'refund' : rest.type,
    status: tab === 'held' ? 'held' : rest.status,
  }
}

export function listPayments(filters: PaymentFilters): Promise<Page<AdminPayment>> {
  return viaSample(
    PAYMENTS_LIST,
    () => api.get<Page<AdminPayment>>('/api/admin/payments', { query: query(filters) }),
    (sample) => sample.listPayments(query(filters)),
  )
}

export function getPayment(id: string): Promise<AdminPaymentDetail> {
  return viaSample(
    PAYMENT_DETAIL,
    () => api.get<AdminPaymentDetail>(`/api/admin/payments/${id}`),
    (sample) => sample.getPayment(id),
  )
}

export function getPaymentSummary(from: string, to: string): Promise<PaymentSummary> {
  return viaSample(
    PAYMENTS_SUMMARY,
    () => api.get<PaymentSummary>('/api/admin/payments/summary', { query: { from, to } }),
    (sample) => sample.paymentSummary(from, to),
  )
}

/** Asks the provider again; answers the refund with its new status. */
export function retryRefund(id: string): Promise<AdminPayment> {
  return viaSample(
    REFUND_RETRY,
    () => api.post<AdminPayment>(`/api/admin/payments/${id}/retry-refund`),
    (sample) => sample.retryRefund(id),
  )
}

/** Only when the money went back another way; the reason is required. */
export function markRefunded(id: string, reason: string): Promise<AdminPayment> {
  return viaSample(
    REFUND_MANUAL,
    () => api.post<AdminPayment>(`/api/admin/payments/${id}/mark-refunded`, { reason }),
    (sample) => sample.markRefunded(id, reason),
  )
}

/** The payment's audit entries, oldest first. */
export async function getPaymentTimeline(id: string): Promise<AuditEntry[]> {
  if (isSampleId(id)) {
    const sample = await loadSampleAdapter()
    return sample.paymentTimeline(id)
  }
  const page = await getAuditLog({ entityType: 'payment', entityId: id, size: 50 })
  return [...page.content].reverse()
}
