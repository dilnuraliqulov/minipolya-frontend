import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, HandCoins, RefreshCw, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { isApiError } from '../../../shared/api'
import { formatDateTime } from '../../../shared/format'
import { availability } from '../../api/missing'
import {
  getPayment,
  getPaymentTimeline,
  markRefunded,
  REFUND_MANUAL,
  REFUND_RETRY,
  retryRefund,
  type AdminPayment,
  type LinkedPayment,
} from '../../api/payments'
import { entityPath } from '../../audit/links'
import { StatusTimeline } from '../../audit/StatusTimeline'
import { DisabledHint, SOON } from '../../components/Availability'
import { Button } from '../../components/Button'
import { ReasonModal } from '../../components/Modal'
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

function FailedRefund({ payment }: { payment: AdminPayment }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [marking, setMarking] = useState(false)
  const retryMode = availability(REFUND_RETRY)
  const manualMode = availability(REFUND_MANUAL)
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin'] })

  const retry = useMutation({
    mutationFn: () => retryRefund(payment.id),
    onSuccess: (result) => {
      refresh()
      if (result.status === 'failed') {
        toast.error(`Yana amalga oshmadi: ${result.failureReason ?? 'ATMOS xatosi'}`)
      } else {
        toast.success('Pul qaytarildi')
      }
    },
    onError: (error) =>
      toast.error(
        isApiError(error) && error.status === 502
          ? 'ATMOS bilan bogʻlanib boʻlmadi. Keyinroq urinib koʻring'
          : 'Qayta urinib boʻlmadi. Keyinroq urinib koʻring',
      ),
  })
  const manual = useMutation({
    mutationFn: (reason: string) => markRefunded(payment.id, reason),
    onSuccess: () => {
      setMarking(false)
      refresh()
      toast.success('Qoʻlda qaytarildi deb belgilandi')
    },
    onError: () => {
      setMarking(false)
      toast.error('Belgilab boʻlmadi. Qayta urinib koʻring')
    },
  })

  const retryButton = (
    <Button
      icon={RefreshCw}
      disabled={retryMode === 'soon' || retry.isPending}
      onClick={() => retry.mutate()}
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

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-danger bg-danger-soft p-4">
      <p className="flex items-center gap-2 text-base font-semibold text-danger">
        <TriangleAlert size={18} aria-hidden />
        Qaytarish amalga oshmadi
      </p>
      {payment.failureReason && (
        <p className="text-sm text-primary">ATMOS xatosi: «{payment.failureReason}»</p>
      )}
      <div className="flex flex-wrap gap-2.5">
        {retryMode === 'soon' ? (
          <DisabledHint hint={SOON}>{retryButton}</DisabledHint>
        ) : (
          retryButton
        )}
        {manualMode === 'soon' ? (
          <DisabledHint hint={SOON}>{manualButton}</DisabledHint>
        ) : (
          manualButton
        )}
      </div>
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
    </div>
  )
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
          {refund && p.status === 'failed' && <FailedRefund payment={p} />}

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
                <span className={refund ? 'text-danger' : undefined}>{money(p.amount)}</span>
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
              {p.refundReason && <PanelRow label="Qaytarish sababi">{p.refundReason}</PanelRow>}
              {p.refundedManually && (
                <PanelRow label="Qoʻlda qaytarildi">{p.manualRefundReason ?? 'Ha'}</PanelRow>
              )}
            </dl>
          </PanelSection>

          <PanelSection title="Taqsimot">
            <dl className="flex flex-col gap-2.5">
              <PanelRow label={refund ? 'Egadan' : 'Egaga'}>{money(p.ownerAmount)}</PanelRow>
              <PanelRow label={refund ? 'Platformadan' : 'Platformaga'}>
                {money(p.platformAmount)}
              </PanelRow>
              {p.atmosFee !== undefined && (
                <PanelRow label="Karta komissiyasi">{money(p.atmosFee)}</PanelRow>
              )}
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
