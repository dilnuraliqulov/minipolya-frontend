import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { CalendarDays, Inbox, SearchX, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { NO_FILTERS, getStadiums, type StadiumFilters } from '../api/stadiums'
import { errorMessage } from '../api/errors'
import { Button, EmptyState, ErrorState, SearchField, SkeletonList, useToast } from '../components'
import { TabScreen } from '../layout/TabScreen'
import { NotificationBell } from '../notifications/NotificationBell'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { PhoneBanner } from '../profile/PhoneBanner'
import { useMe } from '../profile/queries'
import { useSplashDone } from '../splash'
import { FiltersSheet } from './FiltersSheet'
import { isWhyUsHidden, rememberWhyUsHidden } from './bannerPreference'
import { DatePickerSheet } from './DatePickerSheet'
import { dayLabel } from './dates'
import { WhyUsCarousel } from './WhyUsCarousel'
import { ChallengeCarousel } from './ChallengeCarousel'
import { STADIUM_LISTS_KEY, useToggleFavorite } from './queries'
import { DateStrip } from './SlotPicker'
import { StadiumCardCompact } from './StadiumCardCompact'
import { tashkentToday } from '../../shared/format'

/** Bosh sahifa (the Maydonlar tab): search with filters and a calendar, why-us, teams
 * looking for an opponent, the date strip, the stadium list. The chosen day drives
 * `freeSlotsCount` on the list and travels on to the stadium page (`?date=`). */
export function StadiumsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const toggle = useToggleFavorite()
  const firstName = useMe().data?.firstName
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<StadiumFilters>(NO_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [today] = useState(() => tashkentToday())
  const [date, setDate] = useState(today)
  const [dateOpen, setDateOpen] = useState(false)
  const [whyUsHidden, setWhyUsHidden] = useState(isWhyUsHidden)
  const q = useDebouncedValue(search)
  const active = { ...filters, q }

  const list = useInfiniteQuery({
    queryKey: [...STADIUM_LISTS_KEY, active, date],
    queryFn: ({ pageParam }) => getStadiums(active, pageParam, date),
    // Changing the day keeps the cards up; only their free-hours line waits.
    placeholderData: keepPreviousData,
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })

  // A first load paused offline would otherwise leave the splash up forever.
  useSplashDone(!list.isPending || list.fetchStatus === 'paused')

  const stadiums = list.data?.pages.flatMap((page) => page.content) ?? []
  const sheetFiltered =
    filters.format !== null || filters.maxPrice !== null || filters.district !== null
  const searching = q.trim() !== '' || sheetFiltered
  const total = list.data?.pages[0]?.totalElements
  const clearAll = () => {
    setSearch('')
    setFilters(NO_FILTERS)
  }

  return (
    <TabScreen
      title={firstName ? t('home.greeting', { name: firstName }) : t('app.name')}
      action={<NotificationBell />}
    >
      <PhoneBanner />

      <div className="flex gap-2">
        <SearchField value={search} onChange={setSearch} placeholder={t('stadiums.search')} />
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-label={t('stadiums.filters')}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-background text-link"
        >
          <SlidersHorizontal size={20} aria-hidden />
          {sheetFiltered && (
            <span className="absolute top-2 right-2 size-2 rounded-full bg-accent" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setDateOpen(true)}
          aria-label={t('home.pickDate')}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background text-link"
        >
          <CalendarDays size={20} aria-hidden />
        </button>
      </div>

      {!whyUsHidden && (
        <WhyUsCarousel
          onDismiss={() => {
            rememberWhyUsHidden()
            setWhyUsHidden(true)
          }}
        />
      )}

      <ChallengeCarousel />

      <DateStrip today={today} value={date} onChange={setDate} />

      <section className="flex flex-col gap-3">
        <h2 className="text-title font-bold text-primary">
          {total === undefined
            ? t('stadiums.allTitle')
            : t(searching ? 'stadiums.foundCount' : 'stadiums.allCount', { count: total })}
        </h2>
        {list.isPending ? (
          <SkeletonList variant="stadium" />
        ) : list.isError ? (
          <ErrorState onRetry={() => void list.refetch()} />
        ) : stadiums.length === 0 ? (
          searching ? (
            <EmptyState
              icon={SearchX}
              title={t('stadiums.notFoundTitle')}
              description={
                q.trim()
                  ? t('stadiums.notFoundQuery', { q: q.trim() })
                  : t('stadiums.notFoundFilters')
              }
              actionLabel={t('stadiums.clearSearch')}
              onAction={clearAll}
            />
          ) : (
            <EmptyState
              icon={Inbox}
              title={t('stadiums.emptyTitle')}
              description={t('stadiums.emptyText')}
            />
          )
        ) : (
          <>
            {stadiums.map((stadium) => (
              <StadiumCardCompact
                key={stadium.id}
                stadium={stadium}
                day={dayLabel(today, date)}
                dayLoading={list.isPlaceholderData}
                onOpen={() => navigate(`/stadiums/${stadium.id}?date=${date}`)}
                favorite={
                  stadium.isFavorited === undefined
                    ? undefined
                    : {
                        favorited: stadium.isFavorited,
                        pending: toggle.isPending && toggle.variables === stadium.id,
                        onToggle: () =>
                          toggle.mutate(stadium.id, {
                            onError: (error) => toast.show(errorMessage(error), 'danger'),
                          }),
                      }
                }
              />
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
      </section>

      {dateOpen && (
        <DatePickerSheet
          today={today}
          value={date}
          onClose={() => setDateOpen(false)}
          onChange={(next) => {
            setDate(next)
            setDateOpen(false)
          }}
        />
      )}

      {filtersOpen && (
        <FiltersSheet
          open
          filters={filters}
          onClose={() => setFiltersOpen(false)}
          onApply={(next) => {
            setFilters((f) => ({ ...f, ...next }))
            setFiltersOpen(false)
          }}
        />
      )}
    </TabScreen>
  )
}
