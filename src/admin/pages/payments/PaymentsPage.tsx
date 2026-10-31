import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  Banknote,
  Clock,
  CreditCard,
  Landmark,
  RotateCcw,
  Store,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { formatSomParts } from '../../../shared/format'
import { getStadiumOptions } from '../../api/bookings'
import { availability } from '../../api/missing'
import {
  getPaymentSummary,
  listPayments,
  PAYMENTS_LIST,
  PAYMENTS_SUMMARY,
  type AdminPayment,
  type PaymentFilters,
  type PaymentTab,
} from '../../api/payments'
import { SoonSection } from '../../components/Availability'
import { CARD } from '../../components/card'
import { cx } from '../../components/cx'
import { DataTable, type Column } from '../../components/DataTable'
import { DateRangePicker, type DateRange } from '../../components/DateRangePicker'
import { FilterBar, FilterSelect, SearchField } from '../../components/FilterBar'
import { Pagination } from '../../components/Pagination'
import { Skeleton } from '../../components/Skeleton'
import { StatusBadge } from '../../components/StatusBadge'
import { Tabs } from '../../components/Tabs'
import { useDebounced } from '../../components/useDebounced'
import {
  formatLocalDate,
  formatShortDateTime,
  lastDays,
  monthStart,
  tashkentToday,
} from '../../format'
import { usePageHeader } from '../../layout/pageHeader'
import { useFailedRefunds } from '../../queries'
import { PAYMENT_METHODS, PAYMENT_STATUSES, PAYMENT_TYPES, statusOf } from '../../statuses'
import { money, shortTxn } from './format'
import { CopyButton, PaymentPanel } from './PaymentPanel'

const PAGE_SIZE = 20

const PARAMS = {
  tab: 'tab',
  search: 'q',
  type: 'turi',
  status: 'holat',
  method: 'usul',
  stadium: 'maydon',
  from: 'dan',
  to: 'gacha',
  page: 'sahifa',
  payment: 'tolov',
  period: 'davr',
  periodFrom: 'davr_dan',
  periodTo: 'davr_gacha',
}

const TABS: Array<{ value: PaymentTab; param?: string; label: string }> = [
  { value: 'all', label: 'Barchasi' },
  { value: 'refunds', param: 'qaytarishlar', label: 'Qaytarishlar' },
  { value: 'held', param: 'ushlab', label: 'Ushlab turilgan' },
]

type Period = 'bugun' | 'hafta' | 'oy' | 'boshqa'

/** The summary period as Tashkent days. "Hafta" starts on Monday, "Oy" on the 1st. */
function periodRange(period: Period, custom: DateRange): { from: string; to: string } {
  const today = tashkentToday()
  if (period === 'bugun') return { from: today, to: today }
  if (period === 'hafta') {
    const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7
    return { from: lastDays(today, weekday + 1)[0]!, to: today }
  }
  if (period === 'boshqa' && custom.from) return { from: custom.from, to: custom.to ?? today }
  return { from: monthStart(today), to: today }
}

const COLUMNS: Column<AdminPayment>[] = [
  {
    key: 'time',
    header: 'Vaqt',
    width: 120,
    render: (p) => (
      <span className="text-sm whitespace-nowrap">{formatShortDateTime(p.createdAt)}</span>
    ),
  },
  {
    key: 'payer',
    header: 'Toʻlovchi',
    render: (p) => (
      <span className="flex flex-col">
        <span className="font-medium">{p.userName ?? '—'}</span>
        {p.userPhone && <span className="text-xs text-secondary">{p.userPhone}</span>}
      </span>
    ),
  },
  {
    key: 'type',
    header: 'Turi',
    width: 120,
    render: (p) => PAYMENT_TYPES[p.paymentType] ?? p.paymentType,
  },
  { key: 'stadium', header: 'Maydon', width: 160, render: (p) => p.stadiumName ?? '—' },
  {
    key: 'amount',
    header: 'Summa',
    width: 140,
    render: (p) => (
      <span className={cx('whitespace-nowrap', p.amount < 0 && 'text-danger')}>
        {money(p.amount)}
      </span>
    ),
  },
  {
    key: 'split',
    header: 'Taqsimot',
    width: 160,
    render: (p) =>
      p.method === 'cash' ? (
        <span className="text-secondary" title="Naqd pul toʻgʻridan-toʻgʻri egaga">
          —
        </span>
      ) : (
        <span className="flex flex-col text-xs whitespace-nowrap">
          <span>Egaga: {formatSomParts(p.ownerAmount).amount.replace(/^-/, '−')}</span>
          <span className="text-secondary">
            Platformaga: {formatSomParts(p.platformAmount).amount.replace(/^-/, '−')}
          </span>
        </span>
      ),
  },
  {
    key: 'method',
    header: 'Usul',
    width: 80,
    render: (p) => PAYMENT_METHODS[p.method] ?? p.method,
  },
  {
    key: 'status',
    header: 'Holat',
    width: 140,
    render: (p) => {
      const s = statusOf(PAYMENT_STATUSES, p.status)
      return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
    },
  },
  {
    key: 'txn',
    header: 'ATMOS ID',
    width: 130,
    render: (p) =>
      p.providerTxnId ? (
        <span className="flex items-center gap-1 font-mono text-sm text-secondary">
          {shortTxn(p.providerTxnId)}
          <CopyButton value={p.providerTxnId} label="Tranzaksiya ID nusxasini olish" />
        </span>
      ) : (
        <span className="text-secondary">—</span>
      ),
  },
]

const SUMMARY: Array<{
  key: keyof Awaited<ReturnType<typeof getPaymentSummary>>
  label: string
  icon: LucideIcon
}> = [
  { key: 'appRevenue', label: 'Ilova orqali tushum', icon: Banknote },
  { key: 'cardFees', label: 'Karta komissiyasi', icon: CreditCard },
  { key: 'platformRevenue', label: 'Platforma daromadi', icon: Landmark },
  { key: 'ownerPayouts', label: 'Maydon egalariga', icon: Store },
  { key: 'refunded', label: 'Qaytarilgan', icon: RotateCcw },
  { key: 'held', label: 'Ushlab turilgan', icon: Clock },
]

function Summary({ from, to }: { from: string; to: string }) {
  const mode = availability(PAYMENTS_SUMMARY)
  const summary = useQuery({
    queryKey: ['admin', 'payments', 'summary', from, to],
    queryFn: () => getPaymentSummary(from, to),
    placeholderData: keepPreviousData,
    enabled: mode !== 'soon',
  })
  if (mode === 'soon') return <SoonSection title="Umumiy koʻrsatkichlar" />
  return (
    <section aria-label="Umumiy koʻrsatkichlar" className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {SUMMARY.map(({ key, label, icon: Icon }) => {
          const value = summary.data?.[key]
          const parts = value === undefined ? null : formatSomParts(value)
          return (
            <div key={key} className={cx(CARD, 'flex min-w-0 flex-col gap-2 p-4')}>
              <span className="flex items-center gap-2 text-sm font-medium text-secondary">
                <Icon size={16} aria-hidden className="text-link" />
                {label}
              </span>
              {parts ? (
                <span className="flex flex-wrap items-baseline gap-x-1 font-semibold text-primary">
                  <span className="text-3xl">{parts.amount}</span>
                  <span className="text-sm font-medium text-secondary">{parts.unit}</span>
                </span>
              ) : summary.isError ? (
                <span className="text-sm text-danger">Yuklab boʻlmadi</span>
              ) : (
                <Skeleton className="h-6 w-28" />
              )}
            </div>
          )
        })}
      </div>
      <p className="flex items-center gap-2 text-sm text-secondary">
        Naqd toʻlovlar tushumga kirmaydi
      </p>
    </section>
  )
}

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 'bugun', label: 'Bugun' },
  { value: 'hafta', label: 'Hafta' },
  { value: 'oy', label: 'Oy' },
]

export function PaymentsPage() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get(PARAMS.search) ?? '')
  const debounced = useDebounced(search.trim())

  const tabParam = params.get(PARAMS.tab)
  const tab = TABS.find((t) => t.param === tabParam)?.value ?? 'all'
  const query = params.get(PARAMS.search) ?? ''
  const type = params.get(PARAMS.type) ?? ''
  const status = params.get(PARAMS.status) ?? ''
  const method = params.get(PARAMS.method) ?? ''
  const stadium = params.get(PARAMS.stadium) ?? ''
  const from = params.get(PARAMS.from) ?? undefined
  const to = params.get(PARAMS.to) ?? undefined
  const page = Number(params.get(PARAMS.page) ?? 0) || 0
  const open = params.get(PARAMS.payment)
  const period = (params.get(PARAMS.period) ?? 'oy') as Period
  const custom = {
    from: params.get(PARAMS.periodFrom) ?? undefined,
    to: params.get(PARAMS.periodTo) ?? undefined,
  }
  const range = periodRange(period, custom)
  const mode = availability(PAYMENTS_LIST)
  const failedRefunds = useFailedRefunds()

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

  const filters: PaymentFilters = {
    tab,
    search: query || undefined,
    type: type || undefined,
    status: status || undefined,
    method: method || undefined,
    stadiumId: stadium || undefined,
    from,
    to,
    page,
    size: PAGE_SIZE,
  }
  const list = useQuery({
    queryKey: ['admin', 'payments', 'list', filters],
    queryFn: () => listPayments(filters),
    placeholderData: keepPreviousData,
    enabled: mode !== 'soon',
  })
  const stadiums = useQuery({
    queryKey: ['admin', 'stadiums', 'options'],
    queryFn: getStadiumOptions,
    staleTime: 5 * 60_000,
    enabled: mode !== 'soon',
  })
  usePageHeader({ count: list.data?.totalElements })

  const filtered = Boolean(query || type || status || method || stadium || from || to)

  // Without the list there is nothing to show: no summary, tabs or panel.
  if (mode === 'soon') return <SoonSection />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Davr" className="flex gap-0.5 rounded-md bg-surface p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={period === p.value}
              onClick={() =>
                update(
                  {
                    [PARAMS.period]: p.value === 'oy' ? undefined : p.value,
                    [PARAMS.periodFrom]: undefined,
                    [PARAMS.periodTo]: undefined,
                  },
                  true,
                )
              }
              className={cx(
                'h-8 rounded-sm px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-accent',
                period === p.value
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-secondary hover:text-primary',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <DateRangePicker
          label="Davr"
          value={period === 'boshqa' ? custom : {}}
          onChange={(value) =>
            update(
              value.from
                ? {
                    [PARAMS.period]: 'boshqa',
                    [PARAMS.periodFrom]: value.from,
                    [PARAMS.periodTo]: value.to,
                  }
                : {
                    [PARAMS.period]: undefined,
                    [PARAMS.periodFrom]: undefined,
                    [PARAMS.periodTo]: undefined,
                  },
              true,
            )
          }
        />
        <span className="text-sm text-secondary">
          {formatLocalDate(range.from)} – {formatLocalDate(range.to)}
        </span>
      </div>

      <Summary from={range.from} to={range.to} />

      <Tabs
        label="Toʻlovlar"
        tabs={TABS.map((t) => ({
          value: t.value,
          label: t.label,
          count: t.value === tab ? list.data?.totalElements : undefined,
          alert: t.value === 'refunds' ? failedRefunds?.count : undefined,
        }))}
        value={tab}
        onChange={(value) => {
          const next = TABS.find((t) => t.value === value)
          update({
            [PARAMS.tab]: next?.param,
            [PARAMS.type]: undefined,
            [PARAMS.status]: undefined,
          })
        }}
      />

      <FilterBar
        onClear={
          filtered
            ? () => {
                setSearch('')
                update({
                  [PARAMS.search]: undefined,
                  [PARAMS.type]: undefined,
                  [PARAMS.status]: undefined,
                  [PARAMS.method]: undefined,
                  [PARAMS.stadium]: undefined,
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
          placeholder="Ism, telefon yoki tranzaksiya ID"
        />
        {tab === 'all' && (
          <FilterSelect
            label="Turi"
            value={type}
            options={[
              { value: '', label: 'Barchasi' },
              ...Object.entries(PAYMENT_TYPES).map(([value, label]) => ({ value, label })),
            ]}
            onChange={(value) => update({ [PARAMS.type]: value || undefined })}
          />
        )}
        {tab !== 'held' && (
          <FilterSelect
            label="Holat"
            value={status}
            options={[
              { value: '', label: 'Barchasi' },
              ...Object.entries(PAYMENT_STATUSES)
                .filter(([value]) => value !== 'completed')
                .map(([value, s]) => ({ value, label: s.label })),
            ]}
            onChange={(value) => update({ [PARAMS.status]: value || undefined })}
          />
        )}
        <FilterSelect
          label="Usul"
          value={method}
          options={[
            { value: '', label: 'Barchasi' },
            ...Object.entries(PAYMENT_METHODS).map(([value, label]) => ({ value, label })),
          ]}
          onChange={(value) => update({ [PARAMS.method]: value || undefined })}
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
        <DateRangePicker
          value={{ from, to }}
          onChange={(r) => update({ [PARAMS.from]: r.from, [PARAMS.to]: r.to })}
        />
      </FilterBar>

      <div className="flex flex-col gap-2">
        <DataTable
          columns={COLUMNS}
          rows={list.data?.content}
          rowKey={(p) => p.id}
          selectedKey={open ?? undefined}
          onRowClick={(p) => update({ [PARAMS.payment]: p.id }, true)}
          loading={list.isPending}
          error={list.isError}
          onRetry={() => void list.refetch()}
          empty={
            filtered
              ? { title: 'Hech narsa topilmadi', description: 'Filtrlarni oʻzgartirib koʻring' }
              : tab === 'refunds'
                ? { title: 'Qaytarishlar yoʻq' }
                : tab === 'held'
                  ? { title: 'Ushlab turilgan toʻlov yoʻq' }
                  : { title: 'Toʻlovlar yoʻq' }
          }
        />
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

      {open && (
        <PaymentPanel
          key={open}
          id={open}
          onClose={() => update({ [PARAMS.payment]: undefined }, true)}
          onOpen={(id) => update({ [PARAMS.payment]: id }, true)}
        />
      )}
    </div>
  )
}
