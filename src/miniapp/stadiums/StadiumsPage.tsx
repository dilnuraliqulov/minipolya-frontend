import { useInfiniteQuery } from '@tanstack/react-query'
import { Inbox, SearchX, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { NO_FILTERS, getStadiums, type StadiumFilters } from '../api/stadiums'
import { errorMessage } from '../api/errors'
import { Button, EmptyState, ErrorState, SearchField, SkeletonList, useToast } from '../components'
import { TabScreen } from '../layout/TabScreen'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { useMe } from '../profile/queries'
import { useSplashDone } from '../splash'
import { tashkentToday } from './dates'
import { FiltersSheet } from './FiltersSheet'
import { isBannerHidden, rememberBannerHidden } from './bannerPreference'
import { InfoBanner } from './InfoBanner'
import { STADIUM_LISTS_KEY, useToggleFavorite } from './queries'
import { DateStrip } from './SlotPicker'
import { StadiumCardCompact } from './StadiumCardCompact'

/** Bosh sahifa (the Maydonlar tab): search and filters, the date strip, the info
 * banner, the stadium list. The chosen day only travels to the stadium page
 * (`?date=`); the list never asks the backend about it (R24/R25). */
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
  const [bannerHidden, setBannerHidden] = useState(isBannerHidden)
  const q = useDebouncedValue(search)
  const active = { ...filters, q }

  const list = useInfiniteQuery({
    queryKey: [...STADIUM_LISTS_KEY, active],
    queryFn: ({ pageParam }) => getStadiums(active, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })

  // A first load paused offline would otherwise leave the splash up forever.
  useSplashDone(!list.isPending || list.fetchStatus === 'paused')

  const stadiums = list.data?.pages.flatMap((page) => page.content) ?? []
  const sheetFiltered =
    filters.format !== null || filters.maxPrice !== null || filters.district !== null
  const searching = q.trim() !== '' || sheetFiltered
  const total = list.data?.pages[0]?.totalElements ?? 0
  const clearAll = () => {
    setSearch('')
    setFilters(NO_FILTERS)
  }

  return (
    <TabScreen title={firstName ? t('home.greeting', { name: firstName }) : t('app.name')}>
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
      </div>

      <DateStrip today={today} value={date} onChange={setDate} />

      {!bannerHidden && (
        <InfoBanner
          onDismiss={() => {
            rememberBannerHidden()
            setBannerHidden(true)
          }}
        />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-title font-bold text-primary">
          {t('stadiums.allCount', { count: total })}
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
