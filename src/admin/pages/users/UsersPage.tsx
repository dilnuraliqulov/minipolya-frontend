import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { formatDate, formatDateTime } from '../../../shared/format'
import { availability, requestFor } from '../../api/missing'
import {
  listUsers,
  USER_FILTERS,
  type AdminUser,
  type UserRole,
  type UserStatus,
} from '../../api/users'
import { DisabledHint, SOON } from '../../components/Availability'
import { Avatar } from '../../components/Avatar'
import { DataTable, type Column } from '../../components/DataTable'
import { FilterBar, FilterSelect, SearchField } from '../../components/FilterBar'
import { Pagination } from '../../components/Pagination'
import { SampleTag } from '../../components/SampleTag'
import { useDebounced } from '../../components/useDebounced'
import { usePageHeader } from '../../layout/pageHeader'
import { RoleBadges, UserStatusBadge } from './badges'

const PAGE_SIZE = 20
const PARAMS = { search: 'q', role: 'rol', status: 'holat', page: 'sahifa' }

const ROLE_OPTIONS: Array<{ value: UserRole | ''; label: string }> = [
  { value: '', label: 'Hammasi' },
  { value: 'player', label: 'Oʻyinchi' },
  { value: 'owner', label: 'Maydon egasi' },
  { value: 'admin', label: 'Admin' },
]
const STATUS_OPTIONS: Array<{ value: UserStatus | ''; label: string }> = [
  { value: '', label: 'Hammasi' },
  { value: 'active', label: 'Faol' },
  { value: 'blocked', label: 'Bloklangan' },
]

const COLUMNS: Column<AdminUser>[] = [
  {
    key: 'name',
    header: 'Foydalanuvchi',
    render: (user) => (
      <span className="flex items-center gap-2.5 font-medium">
        <Avatar name={user.name} />
        {user.name}
      </span>
    ),
  },
  {
    key: 'phone',
    header: 'Telefon',
    width: 180,
    render: (user) => user.phone ?? <span className="text-secondary">—</span>,
  },
  { key: 'roles', header: 'Rol', width: 220, render: (user) => <RoleBadges user={user} /> },
  {
    key: 'created',
    header: 'Roʻyxatdan oʻtgan',
    width: 160,
    render: (user) => (
      <span className="text-secondary" title={formatDateTime(user.createdAt)}>
        {formatDate(user.createdAt)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Holat',
    width: 130,
    render: (user) => <UserStatusBadge blocked={user.isBlocked} />,
  },
]

function DisabledFilter({ label }: { label: string }) {
  return (
    <DisabledHint hint={SOON}>
      <span className="flex h-9 items-center rounded-md border border-border px-3 text-base text-secondary opacity-60">
        {label}: Hammasi
      </span>
    </DisabledHint>
  )
}

export function UsersPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get(PARAMS.search) ?? '')
  const debounced = useDebounced(search.trim())

  const query = params.get(PARAMS.search) ?? ''
  const role = (params.get(PARAMS.role) ?? '') as UserRole | ''
  const status = (params.get(PARAMS.status) ?? '') as UserStatus | ''
  const page = Number(params.get(PARAMS.page) ?? 0) || 0
  const filters = availability(USER_FILTERS)

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

  const listParams = {
    search: query || undefined,
    role: role || undefined,
    status: status || undefined,
    page,
    size: PAGE_SIZE,
  }
  const list = useQuery({
    queryKey: ['admin', 'users', 'list', listParams],
    queryFn: () => listUsers(listParams),
    placeholderData: keepPreviousData,
  })
  const data = list.data
  usePageHeader({ count: data?.totalElements })
  const filtered = Boolean(query || role || status)

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        onClear={
          filtered
            ? () => {
                setSearch('')
                update({
                  [PARAMS.search]: undefined,
                  [PARAMS.role]: undefined,
                  [PARAMS.status]: undefined,
                })
              }
            : undefined
        }
      >
        <div className="w-90 [&>label]:w-full">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Ism yoki telefon boʻyicha qidirish"
          />
        </div>
        {filters === 'soon' ? (
          <>
            <DisabledFilter label="Rol" />
            <DisabledFilter label="Holat" />
          </>
        ) : (
          <>
            <FilterSelect
              label="Rol"
              value={role}
              options={ROLE_OPTIONS}
              onChange={(value) => update({ [PARAMS.role]: value || undefined })}
            />
            <FilterSelect
              label="Holat"
              value={status}
              options={STATUS_OPTIONS}
              onChange={(value) => update({ [PARAMS.status]: value || undefined })}
            />
            {filters === 'sample' && (role || status) && (
              <span className="flex items-center gap-1.5 text-xs text-secondary">
                <SampleTag request={requestFor(USER_FILTERS)!} />
                faqat shu sahifa filtrlanadi
              </span>
            )}
          </>
        )}
      </FilterBar>

      <div className="flex flex-col">
        <DataTable
          columns={COLUMNS}
          rows={data?.content}
          rowKey={(user) => user.id}
          onRowClick={(user) => void navigate(`/foydalanuvchilar/${user.id}`)}
          loading={list.isPending}
          error={list.isError}
          onRetry={() => void list.refetch()}
          empty={
            filtered
              ? { title: 'Hech kim topilmadi', description: 'Boshqa ism yoki raqam bilan qidiring' }
              : { title: 'Foydalanuvchilar yoʻq' }
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
    </div>
  )
}
