import { CalendarSearch } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { BOOKINGS_WHEN } from '../api/bookings'
import { isAvailable } from '../api/missing'
import { Button, cx, EmptyState, ErrorState, SkeletonList } from '../components'
import { TabScreen } from '../layout/TabScreen'
import { BookingCard } from './BookingCard'
import { useBookings } from './queries'

/**
 * Oʻyinlarim — the player's bookings. Kelgusi / Oʻtgan wait for the server
 * filter (R29); meanwhile one list in the server's order. Games are not here yet.
 */
export function BookingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const list = useBookings()
  const bookings = list.data?.pages.flatMap((page) => page.content) ?? []
  const split = isAvailable(BOOKINGS_WHEN)

  return (
    <TabScreen title={t('tabs.games')}>
      <div className="flex flex-col gap-2">
        <div
          role="tablist"
          aria-label={t('bookings.listLabel')}
          className="flex rounded-xl bg-surface p-1"
        >
          {(['upcoming', 'past'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={false}
              disabled={!split}
              className={cx(
                'flex min-h-10 flex-1 items-center justify-center rounded-lg text-base font-medium text-secondary',
                'disabled:opacity-60',
              )}
            >
              {t(`bookings.${key}`)}
            </button>
          ))}
        </div>
        {!split && <p className="px-1 text-xs text-secondary">{t('bookings.filterSoon')}</p>}
      </div>

      {list.isPending ? (
        <SkeletonList count={4} variant="item" />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={CalendarSearch}
          title={t('bookings.emptyTitle')}
          description={t('bookings.emptyText')}
          actionLabel={t('bookings.findPitch')}
          onAction={() => navigate('/')}
        />
      ) : (
        <>
          <ul aria-label={t('bookings.listLabel')} className="flex flex-col gap-3">
            {bookings.map((booking) => (
              <li key={booking.id}>
                <BookingCard booking={booking} />
              </li>
            ))}
          </ul>
          {list.hasNextPage && (
            <Button
              variant="secondary"
              loading={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              {t('bookings.more')}
            </Button>
          )}
        </>
      )}
    </TabScreen>
  )
}
