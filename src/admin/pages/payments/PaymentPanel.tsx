import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, HandCoins, RefreshCw, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { API_MESSAGES, isApiError } from '../../../shared/api'
import { formatDateTime, roundToWholeSom } from '../../../shared/format'
import { availability } from '../../api/missing'
import {
  getPayment,
  getPaymentTimeline,
  markRefunded,
  REFUND_MANUAL,
  REFUND_RETRY,
  resolveReview,
  retryRefund,
  REVIEW_RESOLVE,
  type AdminPayment,
  type LinkedPayment,
  type ReviewOutcome,
} from '../../api/payments'
import { entityPath } from '../../audit/links'
import { StatusTimeline } from '../../audit/StatusTimeline'
import { DisabledHint, SOON } from '../../components/Availability'
import { Button } from '../../components/Button'
import { ConfirmModal, ReasonModal } from '../../components/Modal'
import { PanelRow, PanelSection, SidePanel } from '../../components/SidePanel'
import { Skeleton } from '../../components/Skeleton'
import { ErrorState } from '../../components/States'
import { StatusBadge } from '../../components/StatusBadge'
import { useToast } from '../../components/Toast'
import { formatShortDateTime } from '../../format'
import { money, shortTxn } from './format'
import {
  PAYMENT_METHODS,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  PAYMENT_TYPES,
  statusOf,
} from '../../statuses'

const linkClass =
  'rounded-xs text-link hover:underline focus-visible:outline-2 focus-visible:outline-accent'

export function CopyButton({ value, label }: { value: string; label: string }) {
  const toast = useToast()
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation()
        void navigator.clipboard
          ?.writeText(value)
          .then(() => toast.success('Nusxa olindi'))
          .catch(() => toast.error('Nusxa olib boʻlmadi'))
      }}
      className="rounded-xs p-0.5 text-secondary hover:text-primary focus-visible:outline-2 focus-visible:outline-accent"
    >
      <Copy size={14} aria-hidden />
    </button>
  )
}

function Linked({
  item,
  refund,
  onOpen,
}: {
  item: LinkedPayment
  refund: boolean
  onOpen: (id: string) => void
}) {
  const status = statusOf(PAYMENT_STATUSES, item.status)
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className="flex w-full items-center gap-3 rounded-md border border-border px-3.5 py-2.5 text-left hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base text-primary">
          {refund ? 'Qaytarish' : 'Asl toʻlov'} · {money(item.amount)}
        </span>
        <span className="text-xs text-secondary">
          {formatShortDateTime(item.createdAt)} · {PAYMENT_METHODS[item.method] ?? item.method}
          {item.providerTxnId && ` · ${shortTxn(item.providerTxnId)}`}
        </span>
      </span>
      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
    </button>
  )
}

const NOT_FAILED_ANYMORE = 'Bu qaytarish endi “amalga oshmadi” holatida emas. Sahifa yangilandi'

/** The refund was settled meanwhile (another admin, the reconciler): the 400 says so. */
function isNoLongerFailed(error: unknown): boolean {
  return (
    isApiError(error) &&
    error.status === 400 &&
    (error.message === API_MESSAGES.refundNotFailedRetry ||
      error.message === API_MESSAGES.refundNotFailedMark)
  )
}

/**
 * What an admin can do about a refund the provider declined, in three pieces:
 * the red notice for the panel body, the two decisions for the panel's action
 * bar, and the dialogs they open. One hook, because all three share the same
 * mutations and dialog state.
 *
 * `payment` is undefined while the panel loads, and every piece is null then.
 */
function useFailedRefund(payment: AdminPayment | undefined) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [marking, setMarking] = useState(false)
  const [confirmingRetry, setConfirmingRetry] = useState(false)
  const retryMode = availability(REFUND_RETRY)
  const manualMode = availability(REFUND_MANUAL)
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin'] })
  const id = payment?.id ?? ''

  const retry = useMutation({
    mutationFn: () => retryRefund(id),
    onSuccess: (result) => {
      setConfirmingRetry(false)
      refresh()
      if (result.status === 'failed') {
        toast.error(`Yana amalga oshmadi: ${result.failureReason ?? 'ATMOS xatosi'}`)
      } else {
        toast.success('Pul qaytarildi')
      }
    },
    onError: (error) => {
      setConfirmingRetry(false)
      if (isNoLongerFailed(error)) {
        refresh()
        toast.error(NOT_FAILED_ANYMORE)
        return
      }
      toast.error(
        isApiError(error) && error.status === 502
          ? 'ATMOS bilan bogʻlanib boʻlmadi. Keyinroq urinib koʻring'
          : 'Qayta urinib boʻlmadi. Keyinroq urinib koʻring',
      )
    },
  })
  const manual = useMutation({
    mutationFn: (reason: string) => markRefunded(id, reason),
    onSuccess: () => {
      setMarking(false)
      refresh()
      toast.success('Qoʻlda qaytarildi deb belgilandi')
    },
    onError: (error) => {
      setMarking(false)
      if (isNoLongerFailed(error)) {
        refresh()
        toast.error(NOT_FAILED_ANYMORE)
        return
      }
      toast.error('Belgilab boʻlmadi. Qayta urinib koʻring')
    },
  })

  const retryButton = (
    <Button
      icon={RefreshCw}
      disabled={retryMode === 'soon' || retry.isPending}
      onClick={() => setConfirmingRetry(true)}
    >
      {retry.isPending ? 'Urinilmoqda…' : 'Qayta urinish'}
    </Button>
  )
  const manualButton = (
    <Button
      variant="secondary"
      icon={HandCoins}
      disabled={manualMode === 'soon'}
      onClick={() => setMarking(true)}
    >
      Qoʻlda qaytarildi
    </Button>
  )

  // Only a refund the provider declined offers these.
  if (!payment || payment.paymentType !== 'refund' || payment.status !== 'failed') {
    return { notice: null, actions: null, dialogs: null }
  }

  const notice = (
    <div className="flex flex-col gap-3 rounded-lg border border-danger-text bg-danger-soft p-4">
      <p className="flex items-center gap-2 text-base font-semibold text-danger-text">
        <TriangleAlert size={18} aria-hidden />
        Qaytarish amalga oshmadi
      </p>
      {payment.failureReason && (
        <p className="text-sm text-primary">ATMOS xatosi: «{payment.failureReason}»</p>
      )}
    </div>
  )

  const actions = (
    <>
      {retryMode === 'soon' ? <DisabledHint hint={SOON}>{retryButton}</DisabledHint> : retryButton}
      {manualMode === 'soon' ? (
        <DisabledHint hint={SOON}>{manualButton}</DisabledHint>
      ) : (
        manualButton
      )}
    </>
  )

  const dialogs = (
    <>
      <ConfirmModal
        open={confirmingRetry}
        title="Qaytarishni qayta urinish"
        message={`Pul toʻlovchining kartasiga qaytadan yuboriladi: ${payment.userName ?? 'Toʻlovchi'} · ${money(payment.amount)}. Davom etasizmi?`}
        confirmLabel="Qayta urinish"
        busy={retry.isPending}
        onClose={() => setConfirmingRetry(false)}
        onConfirm={() => retry.mutate()}
      />
      <ReasonModal
        open={marking}
        title="Qoʻlda qaytarildi deb belgilash"
        description={`Faqat pul boshqa yoʻl bilan qaytarilgan boʻlsa belgilang. ${payment.userName ?? 'Toʻlovchi'} · ${money(payment.amount)}.`}
        minLength={10}
        confirmLabel="Belgilash"
        confirmVariant="primary"
        busy={manual.isPending}
        onClose={() => setMarking(false)}
        onConfirm={(reason) => manual.mutate(reason)}
      />
    </>
  )

  return { notice, actions, dialogs }
}

/** The three things an admin can find at ATMOS about an unclear hold. */
const REVIEW_OUTCOMES: Array<{
  outcome: ReviewOutcome
  label: string
  title: string
  hint: string
}> = [
  {
    outcome: 'captured',
    label: 'Yechildi',
    title: 'Pul yechildi deb hal qilish',
    hint: 'ATMOSda pul kartadan yechilgan va saqlanadi.',
  },
  {
    outcome: 'released',
    label: 'Boʻshatildi',
    title: 'Pul boʻshatildi deb hal qilish',
    hint: 'ATMOSda pul yechilmagan: ushlab turish bekor qilingan.',
  },
  {
    outcome: 'refunded',
    label: 'Qaytarildi',
    title: 'Pul qaytarildi deb hal qilish',
    hint: 'Pul yechilgan, keyin kartaga qaytarilgan (ATMOS yoki qoʻlda).',
  },
]

/**
 * F6: a hold whose capture or give-back had no clear answer from ATMOS — the money may or
 * may not have been taken. Nothing settles it automatically; the admin checks it at ATMOS
 * and records what happened. Same three pieces as {@link useFailedRefund}.
 */
function useNeedsReview(payment: AdminPayment | undefined) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [choosing, setChoosing] = useState<ReviewOutcome | null>(null)
  const mode = availability(REVIEW_RESOLVE)
  const id = payment?.id ?? ''

  const resolve = useMutation({
    mutationFn: ({ outcome, reason }: { outcome: ReviewOutcome; reason: string }) =>
      resolveReview(id, outcome, reason),
    onSuccess: () => {
      setChoosing(null)
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      toast.success('Toʻlov hal qilindi')
    },
    onError: (error) => {
      setChoosing(null)
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      toast.error(
        isApiError(error) && error.status === 400
          ? 'Bu toʻlov endi tekshiruvda emas. Sahifa yangilandi'
          : 'Hal qilib boʻlmadi. Qayta urinib koʻring',
      )
    },
  })

  if (!payment || payment.status !== 'needs_review') {
    return { notice: null, actions: null, dialogs: null }
  }

  const notice = (
    <div className="flex flex-col gap-3 rounded-lg border border-danger-text bg-danger-soft p-4">
      <p className="flex items-center gap-2 text-base font-semibold text-danger-text">
        <TriangleAlert size={18} aria-hidden />
        Natija noaniq: ATMOSda tekshiring
      </p>
      <p className="text-sm text-primary">
        Pul kartadan yechilgan yoki yechilmaganini ATMOS aniq aytmadi. Tranzaksiyani ATMOS
        kabinetida tekshiring va nima boʻlganini belgilang.
      </p>
      {payment.failureReason && (
        <p className="text-sm text-primary">Sabab: «{payment.failureReason}»</p>
      )}
    </div>
  )

  const buttons = REVIEW_OUTCOMES.map(({ outcome, label }) => {
    const button = (
      <Button
        key={outcome}
        variant={outcome === 'captured' ? 'primary' : 'secondary'}
        disabled={mode === 'soon' || resolve.isPending}
        onClick={() => setChoosing(outcome)}
      >
        {label}
      </Button>
    )
    return mode === 'soon' ? (
      <DisabledHint key={outcome} hint={SOON}>
        {button}
      </DisabledHint>
    ) : (
      button
    )
  })

  const chosen = REVIEW_OUTCOMES.find((o) => o.outcome === choosing)
  const dialogs = (
    <ReasonModal
      open={chosen !== undefined}
      title={chosen?.title ?? ''}
      description={`${chosen?.hint ?? ''} ${payment.userName ?? 'Toʻlovchi'} · ${money(payment.amount)}. Qanday bilganingizni yozing.`}
      minLength={10}
      confirmLabel="Belgilash"
      confirmVariant="primary"
      busy={resolve.isPending}
      onClose={() => setChoosing(null)}
      onConfirm={(reason) => chosen && resolve.mutate({ outcome: chosen.outcome, reason })}
    />
  )

  return { notice, actions: <>{buttons}</>, dialogs }
}

export function PaymentPanel({
  id,
  onClose,
  onOpen,
}: {
  id: string
  onClose: () => void
  onOpen: (id: string) => void
}) {
  const payment = useQuery({
    queryKey: ['admin', 'payments', 'detail', id],
    queryFn: () => getPayment(id),
    retry: false,
  })
  const timeline = useQuery({
    queryKey: ['admin', 'payments', 'timeline', id],
    queryFn: () => getPaymentTimeline(id),
  })
  const p = payment.data
  const failedRefund = useFailedRefund(p)
  const review = useNeedsReview(p)
  const refund = p?.paymentType === 'refund'
  const type = p ? (PAYMENT_TYPES[p.paymentType] ?? p.paymentType) : ''
  const status = p && statusOf(PAYMENT_STATUSES, p.status)
  // Links only to pages that can show the record.
  const bookingPath = entityPath('booking', p?.bookingId)
  const gamePath = entityPath('game', p?.gameId)

  return (
    <SidePanel
      open
      onClose={onClose}
      title={p ? `${type} · ${money(p.amount)}` : 'Toʻlov'}
      subtitle={p ? `${formatDateTime(p.createdAt)} · ${p.userName ?? '—'}` : undefined}
      actions={failedRefund.actions ?? review.actions}
    >
      {payment.isError ? (
        <ErrorState onRetry={() => void payment.refetch()} className="py-10" />
      ) : !p ? (
        <div aria-busy className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
      ) : (
        <>
          {failedRefund.notice}
          {failedRefund.dialogs}
          {review.notice}
          {review.dialogs}

          <PanelSection title="Toʻlov maʼlumotlari">
            <dl className="flex flex-col gap-2.5">
              <PanelRow label="Toʻlovchi">
                {p.userId ? (
                  <Link to={`/foydalanuvchilar/${p.userId}`} className={linkClass}>
                    {p.userName}
                  </Link>
                ) : (
                  (p.userName ?? '—')
                )}
                {p.userPhone && <span className="text-secondary"> · {p.userPhone}</span>}
              </PanelRow>
              {p.stadiumId && (
                <PanelRow label="Maydon">
                  <Link to={`/maydonlar/${p.stadiumId}`} className={linkClass}>
                    {p.stadiumName}
                  </Link>
                </PanelRow>
              )}
              <PanelRow label="Turi">{refund ? 'Qaytarish (toʻliq)' : type}</PanelRow>
              <PanelRow label="Summa">
                <span className={refund ? 'text-danger-text' : undefined}>{money(p.amount)}</span>
              </PanelRow>
              <PanelRow label="Usul">
                {PAYMENT_METHODS[p.method] ?? p.method}
                {p.method === 'card' && ` (${PAYMENT_PROVIDERS[p.provider] ?? p.provider})`}
              </PanelRow>
              <PanelRow label="Holat">
                {status && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
              </PanelRow>
              {p.providerTxnId && (
                <PanelRow label="ATMOS tranzaksiya ID">
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-sm break-all">{p.providerTxnId}</span>
                    <CopyButton value={p.providerTxnId} label="Tranzaksiya ID nusxasini olish" />
                  </span>
                </PanelRow>
              )}
              {bookingPath && (
                <PanelRow label="Bron">
                  <Link to={bookingPath} className={linkClass}>
                    Bronni ochish
                  </Link>
                </PanelRow>
              )}
              {gamePath && (
                <PanelRow label="Oʻyin">
                  <Link to={gamePath} className={linkClass}>
                    Oʻyinni ochish
                  </Link>
                </PanelRow>
              )}
              {p.teamSide && (
                <PanelRow label="Jamoa tomoni">{p.teamSide.toUpperCase()} jamoa</PanelRow>
              )}
              {p.holdExpiresAt && (
                <PanelRow label="Ushlab turish muddati">{formatDateTime(p.holdExpiresAt)}</PanelRow>
              )}
              {p.refundReason && <PanelRow label="Qaytarish sababi">{p.refundReason}</PanelRow>}
              {p.refundedManually && (
                <PanelRow label="Qoʻlda qaytarildi">{p.manualRefundReason ?? 'Ha'}</PanelRow>
              )}
            </dl>
          </PanelSection>

          <PanelSection title="Taqsimot">
            <dl className="flex flex-col gap-2.5">
              <PanelRow label={refund ? 'Egadan' : 'Egaga'}>
                {money(roundToWholeSom(p.ownerNet))}
              </PanelRow>
              <PanelRow label={refund ? 'Platformadan' : 'Platformaga'}>
                {money(roundToWholeSom(p.platformNet))}
              </PanelRow>
              <PanelRow label="ATMOS">{money(roundToWholeSom(p.atmosFee))}</PanelRow>
            </dl>
          </PanelSection>

          <PanelSection title="Aniq qiymatlar">
            <dl className="flex flex-col gap-2.5">
              <PanelRow label="Egasining ulushi">{money(p.ownerAmount)}</PanelRow>
              <PanelRow label="Platforma ulushi">{money(p.platformAmount)}</PanelRow>
              <PanelRow label="Egasiga sof">{money(p.ownerNet)}</PanelRow>
              <PanelRow label="Platformaga sof">{money(p.platformNet)}</PanelRow>
              <PanelRow label="ATMOS komissiyasi">{money(p.atmosFee)}</PanelRow>
              {p.providerCommission !== undefined && (
                <PanelRow label="ATMOS ushlab qoldi">{money(p.providerCommission)}</PanelRow>
              )}
              {/* Only old payments carry a booking commission; bookings have none now. */}
              {!!p.commissionPercent && (
                <PanelRow label="Komissiya stavkasi">{p.commissionPercent} %</PanelRow>
              )}
            </dl>
          </PanelSection>

          <PanelSection title="Holat tarixi">
            <StatusTimeline
              entries={timeline.data}
              loading={timeline.isPending}
              error={timeline.isError}
            />
          </PanelSection>

          {p.linkedPayments && p.linkedPayments.length > 0 && (
            <PanelSection title="Bogʻliq toʻlovlar">
              <div className="flex flex-col gap-2">
                {p.linkedPayments.map((item) => (
                  <Linked
                    key={item.id}
                    item={item}
                    refund={item.paymentType === 'refund'}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            </PanelSection>
          )}
        </>
      )}
    </SidePanel>
  )
}
