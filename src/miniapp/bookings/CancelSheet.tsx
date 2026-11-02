import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { cancelBooking, type Booking } from '../api/bookings'
import { errorMessage } from '../api/errors'
import { BottomSheet, Button, useToast } from '../components'
import { formatMoney } from '../format'
import { RefundLine } from './RefundLine'

/** "Bronni bekor qilasizmi?" — repeats the API's refund, then reports what was refunded. */
export function CancelSheet({
  open,
  booking,
  onClose,
  onDone,
}: {
  open: boolean
  booking: Booking
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const cancel = useMutation({ mutationFn: () => cancelBooking(booking.id) })

  const confirm = () =>
    cancel.mutate(undefined, {
      onSuccess: (result) => {
        const refund = result.refundAmount ?? 0
        toast.show(
          refund > 0
            ? t('booking.cancelledRefund', { amount: formatMoney(refund) })
            : t('booking.cancelled'),
          'success',
        )
        onDone()
      },
      onError: (error) => {
        toast.show(errorMessage(error), 'danger')
        onDone()
      },
    })

  return (
    <BottomSheet
      open={open}
      title={t('booking.cancelTitle')}
      onClose={() => {
        if (!cancel.isPending) onClose()
      }}
      actions={
        <>
          <Button variant="danger" haptic loading={cancel.isPending} onClick={confirm}>
            {t('booking.cancelConfirm')}
          </Button>
          <Button variant="secondary" disabled={cancel.isPending} onClick={onClose}>
            {t('booking.cancelKeep')}
          </Button>
        </>
      }
    >
      <RefundLine booking={booking} />
    </BottomSheet>
  )
}
