import { useInfiniteQuery } from '@tanstack/react-query'
import { Inbox, SearchX, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import {
  FORMATS,
  NO_FILTERS,
  getStadiums,
  type StadiumFilters,
  type StadiumFormat,
} from '../api/stadiums'
import { errorMessage } from '../api/errors'
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  SearchField,
  SkeletonList,
  useToast,
} from '../components'
import { TabScreen } from '../layout/TabScreen'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { useSplashDone } from '../splash'
import { FiltersSheet } from './FiltersSheet'
import { formatLabel } from './labels'
import { STADIUM_LISTS_KEY, useToggleFavorite } from './queries'
import { StadiumCard } from './StadiumCard'

/** Bosh sahifa (the Maydonlar tab): search, format chips, filters, the stadium list. */
export function StadiumsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const toggle = useToggleFavorite()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<StadiumFilters>(NO_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
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
  const sheetFiltered = filters.maxPrice !== null || filters.district !== null
  const searching = q.trim() !== '' || sheetFiltered || filters.format !== null
  const clearAll = () => {
    setSearch('')
    setFilters(NO_FILTERS)
  }
  const chooseFormat = (format: StadiumFormat | null) => setFilters((f) => ({ ...f, format }))

  return (
    <TabScreen title={t('tabs.stadiums')}>
      <div className="flex gap-2">
        <SearchField value={search} onChange={setSearch} placeholder={t('stadiums.search')} />
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-label={t('stadiums.filters')}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-link"
        >
          <SlidersHorizontal size={20} aria-hidden />
          {sheetFiltered && (
            <span className="absolute top-2 right-2 size-2 rounded-full bg-accent" />
          )}
        </button>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 [scrollbar-width:none]">
        <Chip selected={filters.format === null} onClick={() => chooseFormat(null)}>
          {t('stadiums.allFormats')}
        </Chip>
        {FORMATS.map((format) => (
          <Chip
            key={format}
            selected={filters.format === format}
            onClick={() => chooseFormat(format)}
          >
            {formatLabel(format)}
          </Chip>
        ))}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="flex h-11 items-center text-title font-bold text-primary">
          {t('stadiums.allStadiums')}
        </h2>
        {list.isPending ? (
          <SkeletonList />
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
              <StadiumCard
                key={stadium.id}
                stadium={stadium}
                onOpen={() => navigate(`/stadiums/${stadium.id}`)}
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
