import { useInfiniteQuery } from '@tanstack/react-query'
import { Banknote } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatTime } from '../../shared/format'
import type { Booking } from '../api/bookings'
import { getUnpaidBookings, unpaidKey } from '../api/owner'
import { Button, Card, ErrorState, SkeletonList } from '../components'
import { formatLongDate } from '../format'
import { markActions, useRemainderMarks } from './marks'
import { MarkConfirmSheet, RemainderChip } from './RemainderMark'

/**
 * Hisobot → "Toʻlanmagan qoldiqlar" (R38): live bookings that still owe a
 * remainder, soonest first, each with its mark chip (E10) and "Naqd olindi" (R37) through
 * the same confirmation as Jadval.
 */
export function UnpaidList({ stadiumId, stadiumName }: { stadiumId: string; stadiumName: string }) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState<Booking | null>(null)
  const list = useInfiniteQuery({
    queryKey: unpaidKey(stadiumId),
    queryFn: ({ pageParam }) => getUnpaidBookings(stadiumId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
  const { cash } = useRemainderMarks(stadiumId)
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
                  {`${formatLongDate(booking.startsAt)}, `}
                  <span className="whitespace-nowrap">
                    {`${formatTime(booking.startsAt)}–${formatTime(booking.endsAt)}`}
                  </span>
                </span>
                <span>
                  <RemainderChip booking={booking} owed />
                </span>
              </div>
              {markActions(booking).includes('cash') && (
                <Button
                  variant="secondary"
                  icon={Banknote}
                  block={false}
                  className="shrink-0"
                  onClick={() => setConfirming(booking)}
                >
                  {t('owner.report.cash')}
                </Button>
              )}
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
      {confirming && (
        <MarkConfirmSheet
          kind="cash"
          booking={confirming}
          stadiumName={stadiumName}
          pending={cash.isPending}
          onConfirm={() => cash.mutate(confirming.id, { onSettled: () => setConfirming(null) })}
          onClose={() => setConfirming(null)}
        />
      )}
    </section>
  )
}
