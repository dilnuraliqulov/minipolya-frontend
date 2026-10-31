import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { formatDateTime, formatSom } from '../../../shared/format'
import { isAvailable } from '../../api/missing'
import {
  DISTRICTS,
  listStadiums,
  REJECTED_STATUS,
  STADIUM_LIST_FIELDS,
  type StadiumRow,
  type StadiumTab,
} from '../../api/stadiums'
import { DisabledHint, SOON, SoonSection } from '../../components/Availability'
import { DataTable, type Column } from '../../components/DataTable'
import { FilterBar, FilterSelect, SearchField } from '../../components/FilterBar'
import { Pagination } from '../../components/Pagination'
import { StatusBadge } from '../../components/StatusBadge'
import { Tabs } from '../../components/Tabs'
import { useDebounced } from '../../components/useDebounced'
import { formatAgo, formatPitch } from '../../format'
import { usePageHeader } from '../../layout/pageHeader'
import { STADIUM_FORMATS, STADIUM_STATUSES, statusOf } from '../../statuses'
import { CONTRACT_LABELS } from './labels'

const PAGE_SIZE = 20

const TABS: Array<{ value: StadiumTab; label: string }> = [
  { value: 'pending', label: 'Kutilmoqda' },
  { value: 'approved', label: 'Tasdiqlangan' },
  { value: 'rejected', label: 'Rad etilgan' },
  { value: 'blocked', label: 'Bloklangan' },
  { value: 'all', label: 'Barchasi' },
]

const PARAMS = { tab: 'holat', search: 'q', district: 'tuman', format: 'format', page: 'sahifa' }

function isTab(value: string | null): value is StadiumTab {
  return TABS.some((tab) => tab.value === value)
}

/** `show`: the review fields (R9) exist — thumbnail, Tuman, Narx and ATMOS. */
function columns(tab: StadiumTab, show: boolean): Column<StadiumRow>[] {
  const list: Array<Column<StadiumRow> | false> = [
    {
      key: 'name',
      header: 'Maydon',
      render: (row) => (
        <span className="flex items-center gap-2.5 font-medium">
          {show && (
            <span className="size-10 shrink-0 overflow-hidden rounded-md bg-surface">
              {row.photoUrl && <img src={row.photoUrl} alt="" className="size-full object-cover" />}
            </span>
          )}
          {row.name}
        </span>
      ),
    },
    { key: 'owner', header: 'Egasi', width: 170, render: (row) => row.ownerName },
    show && {
      key: 'district',
      header: 'Tuman',
      width: 140,
      render: (row) => row.district ?? '—',
    },
    { key: 'format', header: 'Format', width: 90, render: (row) => formatPitch(row.format) },
    show && {
      key: 'price',
      header: 'Narx',
      width: 200,
      render: (row) =>
        row.pricePerHour === undefined ? '—' : `${formatSom(row.pricePerHour)}/soat dan`,
    },
    tab === 'pending' &&
      show && {
        key: 'atmos',
        header: 'ATMOS',
        width: 130,
        render: (row) => {
          const contract = CONTRACT_LABELS[row.ownerContractStatus ?? 'none']
          return <StatusBadge tone={contract.tone}>{contract.label}</StatusBadge>
        },
      },
    {
      key: 'created',
      header: 'Qoʻshilgan',
      width: 130,
      render: (row) => (
        <span className="text-secondary" title={formatDateTime(row.createdAt)}>
          {formatAgo(row.createdAt)}
        </span>
      ),
    },
    tab === 'all' && {
      key: 'status',
      header: 'Holat',
      width: 130,
      render: (row) => {
        const status = statusOf(STADIUM_STATUSES, row.status)
        return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      },
    },
  ]
  return list.filter((column): column is Column<StadiumRow> => Boolean(column))
}

export function StadiumsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get(PARAMS.search) ?? '')
  const debounced = useDebounced(search.trim())

  const tabParam = params.get(PARAMS.tab)
  const tab: StadiumTab = isTab(tabParam) ? tabParam : 'pending'
  const district = params.get(PARAMS.district) ?? ''
  const format = params.get(PARAMS.format) ?? ''
  const page = Number(params.get(PARAMS.page) ?? 0) || 0
  const query = params.get(PARAMS.search) ?? ''

  const extras = isAvailable(STADIUM_LIST_FIELDS)

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

  // The debounced search goes to the URL — only when it changes.
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

  const listParams = {
    tab,
    search: query || undefined,
    district: district || undefined,
    format: format || undefined,
    page,
    size: PAGE_SIZE,
  }
  const soonTab = tab === 'rejected' && !isAvailable(REJECTED_STATUS)
  const list = useQuery({
    queryKey: ['admin', 'stadiums', 'list', listParams],
    queryFn: () => listStadiums(listParams),
    placeholderData: keepPreviousData,
    enabled: !soonTab,
  })
  const data = list.data
  usePageHeader({ count: data?.totalElements })

  const filtered = Boolean(query || district || format)

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        label="Maydon holati"
        tabs={TABS.map((t) => ({
          ...t,
          count: t.value === tab && !soonTab ? data?.totalElements : undefined,
        }))}
        value={tab}
        onChange={(value) => update({ [PARAMS.tab]: value === 'pending' ? undefined : value })}
      />
      <FilterBar
        onClear={
          filtered
            ? () => {
                setSearch('')
                update({
                  [PARAMS.search]: undefined,
                  [PARAMS.district]: undefined,
                  [PARAMS.format]: undefined,
                })
              }
            : undefined
        }
      >
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Maydon yoki egasi boʻyicha qidirish"
        />
        {!extras ? (
          <>
            <DisabledHint hint={SOON}>
              <span className="flex h-9 items-center rounded-md border border-border px-3 text-base text-secondary opacity-60">
                Tuman: Barchasi
              </span>
            </DisabledHint>
            <DisabledHint hint={SOON}>
              <span className="flex h-9 items-center rounded-md border border-border px-3 text-base text-secondary opacity-60">
                Format: Barchasi
              </span>
            </DisabledHint>
          </>
        ) : (
          <>
            <FilterSelect
              label="Tuman"
              value={district}
              options={[
                { value: '', label: 'Barchasi' },
                ...DISTRICTS.map((d) => ({ value: d, label: d })),
              ]}
              onChange={(value) => update({ [PARAMS.district]: value || undefined })}
            />
            <FilterSelect
              label="Format"
              value={format}
              options={[
                { value: '', label: 'Barchasi' },
                ...STADIUM_FORMATS.map((f) => ({ value: f, label: formatPitch(f) })),
              ]}
              onChange={(value) => update({ [PARAMS.format]: value || undefined })}
            />
          </>
        )}
      </FilterBar>

      {soonTab ? (
        <SoonSection />
      ) : (
        <div className="flex flex-col">
          <DataTable
            columns={columns(tab, extras)}
            rows={data?.content}
            rowKey={(row) => row.id}
            onRowClick={(row) => void navigate(`/maydonlar/${row.id}`)}
            loading={list.isPending}
            error={list.isError}
            onRetry={() => void list.refetch()}
            empty={
              filtered
                ? { title: 'Hech narsa topilmadi', description: 'Filtrlarni oʻzgartirib koʻring' }
                : tab === 'pending'
                  ? {
                      title: 'Kutilayotgan maydon yoʻq',
                      description: 'Yangi maydonlar shu yerda koʻrinadi',
                    }
                  : { title: 'Maydonlar yoʻq' }
            }
          />
          {data && data.totalPages > 1 && (
            <Pagination
              page={data.page}
              size={data.size}
              totalElements={data.totalElements}
              totalPages={data.totalPages}
              onPageChange={(next) => update({ [PARAMS.page]: String(next) }, true)}
            />
          )}
        </div>
      )}
    </div>
  )
}
