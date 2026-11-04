import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Banknote } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatTime } from '../../shared/format'
import type { Booking } from '../api/bookings'
import { errorMessage } from '../api/errors'
import { getUnpaidBookings, markBookingCash, statsKey, unpaidKey } from '../api/owner'
import { BottomSheet, Button, Card, ErrorState, SkeletonList, useToast } from '../components'
import { formatLongDate, formatMoney } from '../format'

/**
 * Hisobot → "Toʻlanmagan qoldiqlar" (R38): live bookings that still owe a
 * remainder, soonest first, each with "Naqd olindi" (R37) after confirming.
 */
export function UnpaidList({ stadiumId }: { stadiumId: string }) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState<Booking | null>(null)
  const list = useInfiniteQuery({
    queryKey: unpaidKey(stadiumId),
    queryFn: ({ pageParam }) => getUnpaidBookings(stadiumId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
  const cash = useMutation({
    mutationFn: (booking: Booking) => markBookingCash(booking.id),
    onSuccess: () => toast.show(t('owner.booking.cashDone'), 'success'),
    onError: (error) => toast.show(errorMessage(error), 'danger'),
    onSettled: () => {
      setConfirming(null)
      void queryClient.invalidateQueries({ queryKey: unpaidKey(stadiumId) })
      void queryClient.invalidateQueries({ queryKey: statsKey(stadiumId) })
    },
  })
  const items = list.data?.pages.flatMap((page) => page.content) ?? []

  return (
    <section className="flex flex-col gap-3" aria-labelledby="unpaid-title">
      <h3 id="unpaid-title" className="text-lg font-semibold text-primary">
        {t('owner.report.unpaid')}
      </h3>
      {list.isPending ? (
        <SkeletonList count={2} />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <Card className="p-4 text-sm text-secondary">{t('owner.report.unpaidEmpty')}</Card>
      ) : (
        <>
          {items.map((booking) => (
            <Card key={booking.id} className="flex items-center gap-3 p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-md font-semibold text-primary">
                  {booking.clientName ?? t('owner.booking.player')}
                </span>
                <span className="text-sm text-secondary">
                  {`${formatLongDate(booking.startsAt)}, ${formatTime(booking.startsAt)}–${formatTime(booking.endsAt)}`}
                </span>
                <span className="text-sm font-semibold text-warning">
                  {t('owner.report.owes', { amount: formatMoney(booking.remainingAmount) })}
                </span>
              </div>
              <Button
                variant="secondary"
                icon={Banknote}
                block={false}
                className="shrink-0"
                onClick={() => setConfirming(booking)}
              >
                {t('owner.report.cash')}
              </Button>
            </Card>
          ))}
          {list.hasNextPage && (
            <Button
              variant="secondary"
              loading={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              {t('stadiums.more')}
            </Button>
          )}
        </>
      )}
      <BottomSheet
        open={confirming !== null}
        title={t('owner.gameCash.confirmTitle')}
        subtitle={
          confirming
            ? t('owner.booking.cashConfirmText', {
                amount: formatMoney(confirming.remainingAmount),
              })
            : undefined
        }
        onClose={() => {
          if (!cash.isPending) setConfirming(null)
        }}
        actions={
          <>
            <Button
              haptic
              loading={cash.isPending}
              onClick={() => confirming && cash.mutate(confirming)}
            >
              {t('owner.gameCash.confirm')}
            </Button>
            <Button
              variant="secondary"
              disabled={cash.isPending}
              onClick={() => setConfirming(null)}
            >
              {t('owner.cancel')}
            </Button>
          </>
        }
      />
    </section>
  )
}
