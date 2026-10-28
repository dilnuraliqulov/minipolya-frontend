/**
 * DEVELOPMENT ONLY — sample payments for requests R8, R16 and R17, derived
 * from the sample bookings and games so the numbers agree with Bronlar.
 * Re-exported by ./adapter.ts.
 */
import { ApiError, type Page } from '../../../shared/api'
import type { AuditEntry } from '../audit'
import type { AdminPayment, AdminPaymentDetail, LinkedPayment, PaymentSummary } from '../payments'
import type { RefundAlerts } from '../stats'
import { BOOKINGS, GAMES, USERS } from './activity'
import { delay, pageOf } from './adapter'
import { sampleId, seed } from './world'

const COMMISSION = 5
const MINUTE = 60_000

const later = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * MINUTE).toISOString()

/** A 32-hex-digit provider transaction id, stable for a key. */
function txn(key: string): string {
  let out = ''
  for (let i = 0; out.length < 32; i++) out += seed(`${key}:${i}`).toString(16).padStart(8, '0')
  return out.slice(0, 32)
}

function split(amount: number, commission = COMMISSION) {
  const platform = Math.round((amount * commission) / 100)
  return { ownerAmount: amount - platform, platformAmount: platform, commissionPercent: commission }
}

const DECLINED = 'Transaction declined by issuer (code 57)'

function build(): AdminPayment[] {
  const list: AdminPayment[] = []
  let n = 0
  const next = () => sampleId('payment', ++n)

  for (const b of BOOKINGS) {
    const base = {
      userId: b.userId,
      userName: b.userName,
      userPhone: b.userPhone,
      stadiumId: b.stadiumId,
      stadiumName: b.stadiumName,
      bookingId: b.id,
    }
    if (b.paidInApp > 0) {
      const id = next()
      const original: AdminPayment = {
        ...base,
        id,
        createdAt: later(b.createdAt, 1),
        paymentType: 'booking',
        amount: b.paidInApp,
        ...split(b.paidInApp),
        method: 'card',
        provider: 'atmos',
        providerTxnId: txn(id),
        status: 'paid',
      }
      list.push(original)
      if (b.status.startsWith('cancelled')) {
        const refundId = next()
        // Some owner cancellations' refunds failed at the provider.
        const failed = b.status === 'cancelled_by_owner' && seed(b.id) % 2 === 0
        original.status = failed ? 'paid' : 'refunded'
        list.push({
          ...base,
          id: refundId,
          createdAt: b.cancelledAt ?? later(b.createdAt, 60),
          paymentType: 'refund',
          amount: -original.amount,
          ownerAmount: -original.ownerAmount,
          platformAmount: -original.platformAmount,
          commissionPercent: original.commissionPercent,
          method: 'card',
          provider: 'atmos',
          providerTxnId: txn(refundId),
          status: failed ? 'failed' : 'refunded',
          refundReason: b.cancellationReason ?? 'Bron bekor qilindi',
          refundOfPaymentId: id,
          failureReason: failed ? DECLINED : undefined,
        })
      }
    }
    if (b.cashReceived && b.cashReceivedAt) {
      list.push({
        ...base,
        id: next(),
        createdAt: b.cashReceivedAt,
        paymentType: 'remainder',
        amount: b.cashReceived,
        ownerAmount: b.cashReceived,
        platformAmount: 0,
        commissionPercent: COMMISSION,
        method: 'cash',
        provider: 'cash',
        status: 'paid',
      })
    }
  }

  for (const g of GAMES) {
    for (const team of g.teams ?? []) {
      const id = next()
      const amount = team.feeAmount + team.advanceAmount
      const status =
        g.status === 'open' ? 'held' : g.status.startsWith('cancelled') ? 'released' : 'captured'
      const leader = USERS.find((u) => u.id === team.leaderId)
      list.push({
        id,
        createdAt: later(g.createdAt, team.side === 'a' ? 2 : 300),
        userId: team.leaderId,
        userName: team.leaderName,
        userPhone: leader?.phone,
        paymentType: 'team_game',
        stadiumId: g.stadiumId,
        stadiumName: g.stadiumName,
        gameId: g.id,
        amount,
        ownerAmount: team.advanceAmount,
        platformAmount: team.feeAmount,
        commissionPercent: COMMISSION,
        method: 'card',
        provider: 'atmos',
        providerTxnId: txn(id),
        status,
      })
    }
    if (g.serviceFeePerPerson) {
      for (const p of (g.participants ?? []).filter((x) => x.status === 'paid')) {
        const id = next()
        const user = USERS.find((u) => u.id === p.userId)
        list.push({
          id,
          createdAt: later(g.createdAt, 30),
          userId: p.userId,
          userName: p.userName,
          userPhone: user?.phone,
          paymentType: 'service_fee',
          stadiumId: g.stadiumId,
          stadiumName: g.stadiumName,
          gameId: g.id,
          amount: g.serviceFeePerPerson,
          ownerAmount: 0,
          platformAmount: g.serviceFeePerPerson,
          commissionPercent: COMMISSION,
          method: 'card',
          provider: 'atmos',
          providerTxnId: txn(id),
          status: 'paid',
        })
      }
    }
  }
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

const PAYMENTS = build()

const tashkentDay = (iso: string) =>
  new Date(new Date(iso).getTime() + 5 * 3_600_000).toISOString().slice(0, 10)
const squash = (text: string) => text.toLowerCase().replace(/\s/g, '')

export function refundAlerts(): RefundAlerts {
  const failed = PAYMENTS.filter((p) => p.paymentType === 'refund' && p.status === 'failed')
  const oldest = failed.map((p) => p.createdAt).sort()[0]
  return { failedRefunds: failed.length, oldestFailedRefundAt: oldest }
}

export function listPayments(query: {
  search?: string
  type?: string
  status?: string
  method?: string
  stadiumId?: string
  from?: string
  to?: string
  page?: number
  size?: number
}): Promise<Page<AdminPayment>> {
  const search = query.search ? squash(query.search) : ''
  let rows = PAYMENTS.filter((p) => {
    const day = tashkentDay(p.createdAt)
    return (
      (!query.type || p.paymentType === query.type) &&
      (!query.status || p.status === query.status) &&
      (!query.method || p.method === query.method) &&
      (!query.stadiumId || p.stadiumId === query.stadiumId) &&
      (!query.from || day >= query.from) &&
      (!query.to || day <= query.to) &&
      (!search ||
        [p.userName, p.userPhone, p.providerTxnId].some(
          (v) => v !== undefined && squash(v).includes(search),
        ))
    )
  })
  // The refunds tab lists failed refunds first, as the backend is asked to (R16).
  if (query.type === 'refund') {
    rows = [...rows].sort((a, b) => Number(b.status === 'failed') - Number(a.status === 'failed'))
  }
  return delay(pageOf(rows, query.page, query.size))
}

function find(id: string): AdminPayment {
  const payment = PAYMENTS.find((p) => p.id === id)
  if (!payment) throw new ApiError('Payment not found', 404)
  return payment
}

const linked = (p: AdminPayment): LinkedPayment => ({
  id: p.id,
  paymentType: p.paymentType,
  amount: p.amount,
  status: p.status,
  method: p.method,
  providerTxnId: p.providerTxnId,
  createdAt: p.createdAt,
})

export function getPayment(id: string): Promise<AdminPaymentDetail> {
  const payment = find(id)
  const related = PAYMENTS.filter(
    (p) => p.id === payment.refundOfPaymentId || p.refundOfPaymentId === payment.id,
  )
  return delay({ ...payment, linkedPayments: related.map(linked) })
}

export function paymentSummary(from: string, to: string): Promise<PaymentSummary> {
  const inPeriod = PAYMENTS.filter((p) => {
    const day = tashkentDay(p.createdAt)
    return day >= from && day <= to
  })
  const kept = inPeriod.filter(
    (p) =>
      p.method === 'card' && ['paid', 'captured', 'completed'].includes(p.status) && p.amount > 0,
  )
  const refunds = inPeriod.filter((p) => p.paymentType === 'refund' && p.status === 'refunded')
  const sum = (items: AdminPayment[], key: 'amount' | 'ownerAmount' | 'platformAmount') =>
    items.reduce((total, p) => total + p[key], 0)
  return delay({
    appRevenue: sum(kept, 'amount') + sum(refunds, 'amount'),
    platformRevenue: sum(kept, 'platformAmount') + sum(refunds, 'platformAmount'),
    ownerPayouts: sum(kept, 'ownerAmount') + sum(refunds, 'ownerAmount'),
    refunded: -sum(refunds, 'amount'),
    held: sum(
      PAYMENTS.filter((p) => p.status === 'held'),
      'amount',
    ),
  })
}

/** The sample provider declines the first retry and accepts the second. */
const retries = new Map<string, number>()

export function retryRefund(id: string): Promise<AdminPayment> {
  const payment = find(id)
  if (payment.paymentType !== 'refund' || payment.status !== 'failed') {
    return Promise.reject(new ApiError('Only a failed refund can be retried', 400))
  }
  const attempt = (retries.get(id) ?? 0) + 1
  retries.set(id, attempt)
  if (attempt >= 2) {
    payment.status = 'refunded'
    payment.failureReason = undefined
    const original = PAYMENTS.find((p) => p.id === payment.refundOfPaymentId)
    if (original) original.status = 'refunded'
  } else {
    payment.failureReason = 'Card is blocked (code 62)'
  }
  return delay({ ...payment }, 600)
}

export function markRefunded(id: string, reason: string): Promise<AdminPayment> {
  const payment = find(id)
  if (payment.paymentType !== 'refund' || payment.status !== 'failed') {
    return Promise.reject(new ApiError('Only a failed refund can be marked as refunded', 400))
  }
  payment.status = 'refunded'
  payment.refundedManually = true
  payment.manualRefundReason = reason
  payment.failureReason = undefined
  const original = PAYMENTS.find((p) => p.id === payment.refundOfPaymentId)
  if (original) original.status = 'refunded'
  return delay({ ...payment })
}

export function paymentTimeline(id: string): Promise<AuditEntry[]> {
  const p = find(id)
  const entity = { type: 'payment', id, label: p.stadiumName }
  const system = { type: 'SYSTEM' as const }
  const steps: AuditEntry[] = []
  if (p.paymentType === 'refund') {
    const original = PAYMENTS.find((x) => x.id === p.refundOfPaymentId)
    if (original) {
      steps.push({
        id: `${id}-1`,
        time: original.createdAt,
        actor: system,
        action: 'PAYMENT_COMPLETED',
        entity,
        changes: [],
      })
    }
    steps.push({
      id: `${id}-2`,
      time: p.createdAt,
      actor: system,
      action: 'REFUND_REQUESTED',
      entity,
      changes: [],
      reason: p.refundReason,
    })
    if (p.status === 'failed' || retries.has(id)) {
      steps.push({
        id: `${id}-3`,
        time: p.createdAt,
        actor: system,
        action: 'REFUND_FAILED',
        entity,
        changes: [],
        reason: p.failureReason ?? DECLINED,
      })
    }
    if (p.refundedManually) {
      steps.push({
        id: `${id}-4`,
        time: new Date().toISOString(),
        actor: { name: 'Aziz Rahimov', type: 'ADMIN' },
        action: 'REFUND_MARKED_MANUAL',
        entity,
        changes: [],
        reason: p.manualRefundReason,
      })
    } else if (p.status === 'refunded' && !retries.has(id)) {
      steps.push({
        id: `${id}-6`,
        time: later(p.createdAt, 1),
        actor: system,
        action: 'REFUND_CREATED',
        entity,
        changes: [],
      })
    } else if (p.status === 'refunded') {
      steps.push({
        id: `${id}-5`,
        time: new Date().toISOString(),
        actor: { name: 'Aziz Rahimov', type: 'ADMIN' },
        action: 'REFUND_RETRIED',
        entity,
        changes: [],
      })
    }
    return delay(steps)
  }
  steps.push({
    id: `${id}-1`,
    time: p.createdAt,
    actor: system,
    action: 'PAYMENT_COMPLETED',
    entity,
    changes: [],
  })
  if (p.status === 'released') {
    steps.push({
      id: `${id}-2`,
      time: later(p.createdAt, 600),
      actor: system,
      action: 'PAYMENT_RELEASED',
      entity,
      changes: [],
    })
  }
  if (p.status === 'refunded') {
    steps.push({
      id: `${id}-3`,
      time: later(p.createdAt, 120),
      actor: system,
      action: 'REFUND_CREATED',
      entity,
      changes: [],
    })
  }
  return delay(steps)
}
