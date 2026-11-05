import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { payRemainder, type Booking } from '../api/bookings'
import { errorTone } from '../api/errors'
import { AddCardSheet } from '../cards/AddCardSheet'
import { CardRow } from '../cards/CardRow'
import { useCards } from '../cards/queries'
import { BottomSheet, Button, ErrorState, Notice, SkeletonList, useToast } from '../components'
import { formatMoney } from '../format'
import type { PaymentState } from '../payment/machine'
import { usePayment } from '../payment/usePayment'

/** "Qolganini toʻlash": a saved card and the pay-remainder call, through the payment machine. */
export function PayRemainderSheet({
  open,
  booking,
  onClose,
  onPaid,
}: {
  open: boolean
  booking: Booking
  /** The payment state the sheet closed in ("checking" = still being settled). */
  onClose: (outcome: PaymentState['kind']) => void
  onPaid: () => void
}) {
  if (!open) return null
  return <OpenPayRemainder booking={booking} onClose={onClose} onPaid={onPaid} />
}

function OpenPayRemainder({
  booking,
  onClose,
  onPaid,
}: {
  booking: Booking
  /** The payment state the sheet closed in ("checking" = still being settled). */
  onClose: (outcome: PaymentState['kind']) => void
  onPaid: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const cards = useCards()
  const payment = usePayment()
  const { state } = payment
  const [cardId, setCardId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const list = cards.data ?? []
  const card = list.find((c) => c.id === cardId) ?? list[0]
  const paying = state.kind === 'paying'

  const reported = useRef(false)
  useEffect(() => {
    if (state.kind !== 'success' || reported.current) return
    reported.current = true
    toast.show(t('booking.restPaid'), 'success')
    onPaid()
  }, [state, toast, t, onPaid])

  const pay = () => {
    if (!card) return
    void payment.pay(() => payRemainder(booking.id, card.id), { paymentType: 'remainder' })
  }

  const problem =
    state.kind === 'declined'
      ? t('checkout.declinedText')
      : state.kind === 'checking'
        ? t('checkout.checkingText')
        : state.kind === 'failed'
          ? t(state.errorKey)
          : null

  return (
    <>
      <BottomSheet
        open={!adding}
        title={t('booking.payRestTitle')}
        onClose={() => {
          if (!paying) onClose(state.kind)
        }}
        actions={
          state.kind === 'checking' ? (
            <Button variant="secondary" onClick={() => onClose(state.kind)}>
              {t('cards.back')}
            </Button>
          ) : (
            <Button haptic loading={paying} disabled={!card} onClick={pay}>
              {paying
                ? t('checkout.paying')
                : t('booking.payRestButton', { amount: formatMoney(booking.remainingAmount) })}
            </Button>
          )
        }
      >
        {cards.isPending ? (
          <SkeletonList count={2} variant="item" />
        ) : cards.isError ? (
          <ErrorState onRetry={() => void cards.refetch()} />
        ) : (
          <div className="flex flex-col gap-3">
            {list.length > 0 && (
              <div
                role="radiogroup"
                aria-label={t('checkout.card')}
                className="flex flex-col gap-3"
              >
                {list.map((c) => (
                  <CardRow
                    key={c.id}
                    card={c}
                    selected={c.id === card?.id}
                    invalid={state.kind === 'declined' && c.id === card?.id}
                    onSelect={() => {
                      if (!paying) setCardId(c.id)
                    }}
                  />
                ))}
              </div>
            )}
            <Button variant="ghost" icon={Plus} disabled={paying} onClick={() => setAdding(true)}>
              {t('cards.add')}
            </Button>
            {list.length === 0 && (
              <p className="text-sm text-secondary">{t('checkout.addCardFirst')}</p>
            )}
            {problem && (
              <Notice tone={state.kind === 'failed' ? errorTone(state.errorKey) : 'danger'}>
                {problem}
              </Notice>
            )}
          </div>
        )}
      </BottomSheet>
      <AddCardSheet
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={(saved) => {
          setAdding(false)
          setCardId(saved.id)
        }}
      />
    </>
  )
}
