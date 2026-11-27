import { api, type Page } from '../../shared/api'
import { getAuditLog, type AuditEntry } from './audit'

/**
 * Payments for the admin panel — requests R16 (list, detail, period summary)
 * and R17 (refunds that can fail, retry, mark as refunded by hand). A
 * payment's status history comes from the audit log.
 */

/**
 * `AdminPaymentResponse`. Money in tiyin; a refund's amounts are negative;
 * `amount = ownerAmount + platformAmount`.
 */
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
  /** What the owner keeps after ATMOS; `ownerNet + platformNet + atmosFee = amount`. */
  ownerNet: number
  /** What the platform keeps after ATMOS: exactly the fee on a team payment. */
  platformNet: number
  /** What ATMOS was expected to take (on old rows: what the card fee and rounding added). */
  atmosFee: number
  /** What ATMOS reports having taken; absent until it does. */
  providerCommission?: number
  /**
   * The booking commission stored on the payment. Bookings have none any more;
   * only old payments carry one above 0.
   */
  commissionPercent?: number
  /** `card` | `cash`. */
  method: string
  /** `atmos` | `cash`; `payme` / `click` only on rows the removed hosted checkout left. */
  provider: string
  /** The provider's transaction id; absent for cash. */
  providerTxnId?: string
  /** A `payment.status` value (§1.9). */
  status: string
  refundReason?: string
  /** For a refund: the payment it gives back. */
  refundOfPaymentId?: string
  /**
   * For a failed refund: the provider's error, as it sent it. For a `needs_review` hold:
   * why its outcome is unclear ("Capture unclear: …" / "Give-back unclear: …").
   */
  failureReason?: string
  /** An admin marked this refund as paid back outside the platform. */
  refundedManually?: boolean
  manualRefundReason?: string
  /** A hold: when it lapses at the provider if nobody settles it (UTC). */
  holdExpiresAt?: string
  /** A team-game payment: the team it belongs to. */
  gameTeamId?: string
  /** A team-game payment: its team's side. */
  teamSide?: 'a' | 'b'
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
  linkedPayments?: LinkedPayment[]
}

/**
 * `AdminPaymentSummaryResponse` — one period, all tiyin, computed by the
 * backend: `ownerPayouts + platformRevenue + cardFees = appRevenue`.
 */
export interface PaymentSummary {
  /** Card payments kept through the app (cash not included). */
  appRevenue: number
  /** What ATMOS took of that money. */
  cardFees: number
  /** The platform's share of those, less its part of the card fee. */
  platformRevenue: number
  /** The owners' share of those, less their part of the card fee. */
  ownerPayouts: number
  /** Card refunds completed in the period (a positive amount). */
  refunded: number
  /** Everything on hold on players' cards right now, whatever the period. */
  held: number
}

/**
 * `ProviderCheckResponse`: which card provider the backend talks to and whether it
 * answered just now. `host` is the base URL's host and is absent under `fake` — the
 * stand-in reaches nothing, so `ok` there means "no real provider is wired in", not that
 * anything answered. `errorCode` is the provider's own code and is absent when ok.
 *
 * `environment` is which side of ATMOS the backend's credentials are for. The sandbox
 * answers on the **same host** as production, so it is the only thing that tells them
 * apart — never the host.
 *
 * A provider that is down is a normal 200 with `status: 'failed'`, not a failed request.
 */
export interface ProviderCheck {
  status: 'ok' | 'failed'
  provider: 'atmos' | 'fake'
  host?: string
  environment?: 'sandbox' | 'production'
  errorCode?: string
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
export const PROVIDER_CHECK = 'GET /api/admin/payments/provider-check'
export const REVIEW_RESOLVE = 'POST /api/admin/payments/{id}/resolve-review'

/**
 * Ushlab turilgan: every hold still on a card or waiting on someone — held, being
 * captured, being given back, or waiting for an admin (`needs_review`). The backend takes
 * several statuses comma-separated.
 */
export const HELD_TAB_STATUSES = 'held,capture_pending,return_pending,needs_review'

/**
 * The tabs are filters: Qaytarishlar is `type=refund` (the backend lists failed
 * ones first), Ushlab turilgan is every hold still in play (`HELD_TAB_STATUSES`).
 */
function query(filters: PaymentFilters) {
  const { tab, search, ...rest } = filters
  return {
    ...rest,
    search: search?.trim() || undefined,
    type: tab === 'refunds' ? 'refund' : rest.type,
    status: tab === 'held' ? HELD_TAB_STATUSES : rest.status,
  }
}

export function listPayments(filters: PaymentFilters): Promise<Page<AdminPayment>> {
  return api.get<Page<AdminPayment>>('/api/admin/payments', { query: query(filters) })
}

export function getPayment(id: string): Promise<AdminPaymentDetail> {
  return api.get<AdminPaymentDetail>(`/api/admin/payments/${id}`)
}

/** Both days required. */
export function getPaymentSummary(from: string, to: string): Promise<PaymentSummary> {
  return api.get<PaymentSummary>('/api/admin/payments/summary', { query: { from, to } })
}

/**
 * Asks the provider again; answers the refund with its new status. A decline
 * is a normal answer (still `failed`, a new `failureReason`); 502 when the
 * provider cannot be reached.
 */
export function retryRefund(id: string): Promise<AdminPayment> {
  return api.post<AdminPayment>(`/api/admin/payments/${id}/retry-refund`)
}

/** Only when the money went back another way; the reason is 10–500 characters. */
export function markRefunded(id: string, reason: string): Promise<AdminPayment> {
  return api.post<AdminPayment>(`/api/admin/payments/${id}/mark-refunded`, { reason })
}

/** What an admin found at ATMOS about a `needs_review` hold. */
export type ReviewOutcome = 'captured' | 'released' | 'refunded'

/**
 * Settles a `needs_review` hold by hand, after checking it at ATMOS. No money moves here;
 * the reason (10–500 characters) says how the admin knows. Answers the payment detail.
 */
export function resolveReview(
  id: string,
  outcome: ReviewOutcome,
  reason: string,
): Promise<AdminPaymentDetail> {
  return api.post<AdminPaymentDetail>(`/api/admin/payments/${id}/resolve-review`, {
    outcome,
    reason,
  })
}

/**
 * Asks the backend to reach the card provider now (the real client buys a fresh ATMOS
 * token). Every call is a real round trip, so it is not for polling. It never carries a
 * token or a credential.
 */
export function getProviderCheck(): Promise<ProviderCheck> {
  return api.get<ProviderCheck>('/api/admin/payments/provider-check')
}

/** The payment's audit entries, oldest first. */
export async function getPaymentTimeline(id: string): Promise<AuditEntry[]> {
  const page = await getAuditLog({ entityType: 'payment', entityId: id, size: 50 })
  return [...page.content].reverse()
}
