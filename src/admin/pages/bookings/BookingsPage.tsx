import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { formatSom, formatSomParts } from '../../../shared/format'
import {
  BOOKINGS_LIST,
  GAMES_LIST,
  getStadiumOptions,
  listBookings,
  listGames,
  type AdminBooking,
  type AdminGame,
  type BookingFilters,
} from '../../api/bookings'
import { availability, requestFor } from '../../api/missing'
import { SoonSection } from '../../components/Availability'
import { DataTable, type Column } from '../../components/DataTable'
import { DateRangePicker } from '../../components/DateRangePicker'
import { FilterBar, FilterSelect, SearchField } from '../../components/FilterBar'
import { Pagination } from '../../components/Pagination'
import { SampleTag } from '../../components/SampleTag'
import { StatusBadge } from '../../components/StatusBadge'
import { Tabs } from '../../components/Tabs'
import { useDebounced } from '../../components/useDebounced'
import { formatSlot } from '../../format'
import { usePageHeader } from '../../layout/pageHeader'
import { BOOKING_STATUSES, GAME_STATUSES, gameStatus, statusOf } from '../../statuses'
import { BookingPanel, GamePanel } from './panels'

const PAGE_SIZE = 20

type Tab = 'bookings' | 'games'

/** Filters and the open panel live in the URL, so a booking can be linked to. */
const PARAMS = {
  tab: 'tab',
  search: 'q',
  stadium: 'maydon',
  status: 'holat',
  from: 'dan',
  to: 'gacha',
  page: 'sahifa',
  booking: 'bron',
  game: 'oyin',
}

const som = (tiyin: number) => formatSomParts(tiyin).amount

const BOOKING_COLUMNS: Column<AdminBooking>[] = [
  {
    key: 'when',
    header: 'Sana va vaqt',
    width: 210,
    render: (b) => <span className="whitespace-nowrap">{formatSlot(b.startsAt, b.endsAt)}</span>,
  },
  { key: 'stadium', header: 'Maydon', render: (b) => b.stadiumName },
  {
    key: 'client',
    header: 'Mijoz',
    width: 240,
    render: (b) => (
      <span className="flex flex-col">
        <span className="flex items-center gap-1.5 font-medium">
          {b.userName ?? b.clientName ?? '—'}
          {b.isWalkin && <StatusBadge tone="neutral">Qoʻlda</StatusBadge>}
        </span>
        {(b.userPhone ?? b.clientPhone) && (
          <span className="text-sm text-secondary">{b.userPhone ?? b.clientPhone}</span>
        )}
      </span>
    ),
  },
  {
    key: 'price',
    header: 'Narx',
    width: 130,
    render: (b) => <span title={formatSom(b.price)}>{som(b.price)}</span>,
  },
  {
    key: 'paid',
    header: 'Toʻlangan',
    width: 170,
    render: (b) => (
      <span className="whitespace-nowrap" title="Toʻlangan / narx, soʻm">
        {som(b.paidAmount)} / {som(b.price)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Holat',
    width: 160,
    render: (b) => {
      const s = statusOf(BOOKING_STATUSES, b.status)
      return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
    },
  },
]

function Teams({ game }: { game: AdminGame }) {
  if (game.type === 'team_vs_team') {
    return game.teamBName ? (
      <span className="font-medium">
        {game.teamAName} <span className="text-secondary">vs</span> {game.teamBName}
      </span>
    ) : (
      <span className="flex flex-col">
        <span className="font-medium">{game.teamAName}</span>
        <span className="text-sm text-secondary">Raqib kutilmoqda</span>
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 font-medium">
      {game.creatorName}
      <StatusBadge tone="accent">
        {game.type === 'casual' ? 'Doʻstlar bilan' : 'Ochiq oʻyin'}
      </StatusBadge>
    </span>
  )
}

const GAME_COLUMNS: Column<AdminGame>[] = [
  {
    key: 'when',
    header: 'Sana va vaqt',
    width: 210,
    render: (g) => <span className="whitespace-nowrap">{formatSlot(g.startsAt, g.endsAt)}</span>,
  },
  { key: 'stadium', header: 'Maydon', render: (g) => g.stadiumName },
  { key: 'teams', header: 'Jamoalar', width: 360, render: (g) => <Teams game={g} /> },
  {
    key: 'status',
    header: 'Holat',
    width: 170,
    render: (g) => {
      const s = gameStatus(g.type, g.status)
      return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
    },
  },
]

export function BookingsPage() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get(PARAMS.search) ?? '')
  const debounced = useDebounced(search.trim())

  const tab: Tab = params.get(PARAMS.tab) === 'oyinlar' ? 'games' : 'bookings'
  const query = params.get(PARAMS.search) ?? ''
  const stadium = params.get(PARAMS.stadium) ?? ''
  const status = params.get(PARAMS.status) ?? ''
  const from = params.get(PARAMS.from) ?? undefined
  const to = params.get(PARAMS.to) ?? undefined
  const page = Number(params.get(PARAMS.page) ?? 0) || 0
  const openBooking = params.get(PARAMS.booking)
  const openGame = params.get(PARAMS.game)
  const mode = availability(tab === 'bookings' ? BOOKINGS_LIST : GAMES_LIST)

  const update = (changes: Record<string, string | undefined>, keepPage = false) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        if (!keepPage) next.delete(PARAMS.page)
        return next
      },
      { replace: true },
    )

  const written = useRef(debounced)
  useEffect(() => {
    if (written.current === debounced) return
    written.current = debounced
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (debounced) next.set(PARAMS.search, debounced)
        else next.delete(PARAMS.search)
        next.delete(PARAMS.page)
        return next
      },
      { replace: true },
    )
  }, [debounced, setParams])

  const filters: BookingFilters = {
    search: query || undefined,
    stadiumId: stadium || undefined,
    status: status || undefined,
    from,
    to,
    page,
    size: PAGE_SIZE,
  }
  const bookings = useQuery({
    queryKey: ['admin', 'bookings', 'list', filters],
    queryFn: () => listBookings(filters),
    placeholderData: keepPreviousData,
    enabled: tab === 'bookings' && mode !== 'soon',
  })
  const games = useQuery({
    queryKey: ['admin', 'games', 'list', filters],
    queryFn: () => listGames(filters),
    placeholderData: keepPreviousData,
    enabled: tab === 'games' && mode !== 'soon',
  })
  const stadiums = useQuery({
    queryKey: ['admin', 'stadiums', 'options'],
    queryFn: getStadiumOptions,
    staleTime: 5 * 60_000,
    enabled: mode !== 'soon',
  })
  const list = tab === 'bookings' ? bookings : games
  usePageHeader({
    title: tab === 'games' ? 'Oʻyinlar' : 'Bronlar',
    count: list.data?.totalElements,
  })

  const filtered = Boolean(query || stadium || status || from || to)
  const statusOptions = Object.entries(tab === 'bookings' ? BOOKING_STATUSES : GAME_STATUSES).map(
    ([value, s]) => ({ value, label: s.label }),
  )
  const empty = filtered
    ? { title: 'Hech narsa topilmadi', description: 'Filtrlarni oʻzgartirib koʻring' }
    : tab === 'bookings'
      ? { title: 'Bronlar yoʻq' }
      : { title: 'Oʻyinlar yoʻq' }

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        label="Bronlar va oʻyinlar"
        tabs={[
          { value: 'bookings' as const, label: 'Bronlar' },
          { value: 'games' as const, label: 'Oʻyinlar' },
        ]}
        value={tab}
        onChange={(value) => {
          setSearch('')
          // Each tab has its own statuses; start the other tab unfiltered.
          setParams(value === 'games' ? { [PARAMS.tab]: 'oyinlar' } : {}, { replace: true })
        }}
      />

      {mode === 'soon' ? (
        <SoonSection />
      ) : (
        <>
          <FilterBar
            onClear={
              filtered
                ? () => {
                    setSearch('')
                    update({
                      [PARAMS.search]: undefined,
                      [PARAMS.stadium]: undefined,
                      [PARAMS.status]: undefined,
                      [PARAMS.from]: undefined,
                      [PARAMS.to]: undefined,
                    })
                  }
                : undefined
            }
          >
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={
                tab === 'bookings' ? 'Mijoz ismi yoki telefon boʻyicha' : 'Jamoa yoki ism boʻyicha'
              }
            />
            <FilterSelect
              label="Maydon"
              value={stadium}
              options={[
                { value: '', label: 'Barchasi' },
                ...(stadiums.data ?? []).map((s) => ({ value: s.id, label: s.name })),
              ]}
              onChange={(value) => update({ [PARAMS.stadium]: value || undefined })}
            />
            <FilterSelect
              label="Holat"
              value={status}
              options={[{ value: '', label: 'Barchasi' }, ...statusOptions]}
              onChange={(value) => update({ [PARAMS.status]: value || undefined })}
            />
            <DateRangePicker
              value={{ from, to }}
              onChange={(range) => update({ [PARAMS.from]: range.from, [PARAMS.to]: range.to })}
            />
          </FilterBar>

          <div className="flex flex-col gap-2">
            {mode === 'sample' && (
              <span className="self-start">
                <SampleTag request={requestFor(BOOKINGS_LIST)!} />
              </span>
            )}
            {tab === 'bookings' ? (
              <DataTable
                columns={BOOKING_COLUMNS}
                rows={bookings.data?.content}
                rowKey={(b) => b.id}
                selectedKey={openBooking ?? undefined}
                onRowClick={(b) => update({ [PARAMS.booking]: b.id }, true)}
                loading={bookings.isPending}
                error={bookings.isError}
                onRetry={() => void bookings.refetch()}
                empty={empty}
              />
            ) : (
              <DataTable
                columns={GAME_COLUMNS}
                rows={games.data?.content}
                rowKey={(g) => g.id}
                selectedKey={openGame ?? undefined}
                onRowClick={(g) => update({ [PARAMS.game]: g.id }, true)}
                loading={games.isPending}
                error={games.isError}
                onRetry={() => void games.refetch()}
                empty={empty}
              />
            )}
            {list.data && list.data.totalPages > 1 && (
              <Pagination
                page={list.data.page}
                size={list.data.size}
                totalElements={list.data.totalElements}
                totalPages={list.data.totalPages}
                onPageChange={(next) => update({ [PARAMS.page]: String(next) }, true)}
              />
            )}
          </div>
        </>
      )}

      {openBooking && availability(BOOKINGS_LIST) !== 'soon' && (
        <BookingPanel
          key={openBooking}
          id={openBooking}
          onClose={() => update({ [PARAMS.booking]: undefined }, true)}
        />
      )}
      {openGame && availability(GAMES_LIST) !== 'soon' && (
        <GamePanel
          key={openGame}
          id={openGame}
          onClose={() => update({ [PARAMS.game]: undefined }, true)}
        />
      )}
    </div>
  )
}
