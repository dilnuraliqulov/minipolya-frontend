import { CalendarSearch } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import type { BookingsWhen } from '../api/bookings'
import { Button, cx, EmptyState, ErrorState, SkeletonList } from '../components'
import { MyGames } from '../games/MyGames'
import { TabScreen } from '../layout/TabScreen'
import { BookingCard } from './BookingCard'
import { useBookings } from './queries'

const TABS: BookingsWhen[] = ['upcoming', 'past']

/**
 * Oʻyinlarim — the player's bookings, Kelgusi / Oʻtgan split by the server
 * (R29, `?when=`), each in the server's order. The tab lives in the URL
 * (`?tab=past`), so coming back from a booking keeps it. Games come first,
 * from their own endpoint (no client merge).
 */
export function BookingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const when: BookingsWhen = search.get('tab') === 'past' ? 'past' : 'upcoming'
  const list = useBookings(when)
  const bookings = list.data?.pages.flatMap((page) => page.content) ?? []

  return (
    <TabScreen title={t('tabs.games')}>
      <div className="flex flex-col gap-2">
        <div
          role="tablist"
          aria-label={t('bookings.listLabel')}
          className="flex rounded-xl bg-surface p-1"
        >
          {TABS.map((key) => (
            <button
              key={key}
              id={`bookings-tab-${key}`}
              type="button"
              role="tab"
              aria-selected={key === when}
              aria-controls="bookings-panel"
              onClick={() => {
                if (key !== when)
                  setSearch(key === 'past' ? { tab: 'past' } : {}, { replace: true })
              }}
              className={cx(
                'flex min-h-11 flex-1 items-center justify-center rounded-lg text-base font-medium',
                key === when ? 'bg-background text-primary shadow-sm' : 'text-secondary',
              )}
            >
              {t(`bookings.${key}`)}
            </button>
          ))}
        </div>
      </div>

      <MyGames />

      <div
        id="bookings-panel"
        role="tabpanel"
        aria-labelledby={`bookings-tab-${when}`}
        className="flex flex-col gap-3"
      >
        {list.isPending ? (
          <SkeletonList count={4} variant="item" />
        ) : list.isError ? (
          <ErrorState onRetry={() => void list.refetch()} />
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={CalendarSearch}
            title={when === 'past' ? t('bookings.emptyPastTitle') : t('bookings.emptyTitle')}
            description={when === 'past' ? t('bookings.emptyPastText') : t('bookings.emptyText')}
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
      </div>
    </TabScreen>
  )
}
