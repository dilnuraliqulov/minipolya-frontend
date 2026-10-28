import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  getAuditActions,
  getAuditLog,
  type AuditActorType,
  type AuditFilters,
} from '../../api/audit'
import { AuditLogTable } from '../../audit/AuditLogTable'
import { ACTOR_TYPE_LABELS, actionLabel } from '../../audit/labels'
import { DateRangePicker } from '../../components/DateRangePicker'
import { FilterBar, FilterSelect, SearchField } from '../../components/FilterBar'
import { Pagination } from '../../components/Pagination'
import { useDebounced } from '../../components/useDebounced'
import { usePageHeader } from '../../layout/pageHeader'

const PAGE_SIZE = 20

const ACTOR_TYPES = Object.keys(ACTOR_TYPE_LABELS) as AuditActorType[]

/** The filters live in the URL, so a filtered view can be linked and survives back/forward. */
const PARAMS = {
  actor: 'kim',
  actorType: 'turi',
  action: 'harakat',
  from: 'dan',
  to: 'gacha',
  page: 'sahifa',
}

export function JournalPage() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get(PARAMS.actor) ?? '')
  const actor = useDebounced(search.trim())

  // The request reads the URL, which the debounced search below writes to.
  const actorParam = params.get(PARAMS.actor) ?? ''
  const actorType = (params.get(PARAMS.actorType) ?? '') as AuditActorType | ''
  const action = params.get(PARAMS.action) ?? ''
  const from = params.get(PARAMS.from) ?? undefined
  const to = params.get(PARAMS.to) ?? undefined
  const page = Number(params.get(PARAMS.page) ?? 0) || 0

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

  // The debounced search goes to the URL, back to the first page — only when it
  // changes (setParams changes identity on every navigation, e.g. "Tozalash").
  const written = useRef(actor)
  useEffect(() => {
    if (written.current === actor) return
    written.current = actor
    setParams(
      (current) => {
        if ((current.get(PARAMS.actor) ?? '') === actor) return current
        const next = new URLSearchParams(current)
        if (actor) next.set(PARAMS.actor, actor)
        else next.delete(PARAMS.actor)
        next.delete(PARAMS.page)
        return next
      },
      { replace: true },
    )
  }, [actor, setParams])

  const filters: AuditFilters = {
    actor: actorParam || undefined,
    actorType: actorType || undefined,
    actions: action ? [action] : undefined,
    from,
    to,
    page,
    size: PAGE_SIZE,
  }
  const log = useQuery({
    queryKey: ['admin', 'audit-log', 'journal', filters],
    queryFn: () => getAuditLog(filters),
    placeholderData: keepPreviousData,
  })
  const actions = useQuery({
    queryKey: ['admin', 'audit-log', 'actions'],
    queryFn: getAuditActions,
    staleTime: Infinity,
  })
  usePageHeader({ count: log.data?.totalElements })

  const filtered = Boolean(actorParam || actorType || action || from || to)
  const data = log.data

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        onClear={
          filtered
            ? () => {
                setSearch('')
                setParams(new URLSearchParams(), { replace: true })
              }
            : undefined
        }
      >
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Kim: ism yoki telefon"
          label="Kim"
        />
        <FilterSelect
          label="Turi"
          value={actorType}
          options={[
            { value: '', label: 'Barchasi' },
            ...ACTOR_TYPES.map((type) => ({ value: type, label: ACTOR_TYPE_LABELS[type] })),
          ]}
          onChange={(value) => update({ [PARAMS.actorType]: value || undefined })}
        />
        <FilterSelect
          label="Harakat"
          value={action}
          options={[
            { value: '', label: 'Barchasi' },
            ...(actions.data ?? []).map((code) => ({ value: code, label: actionLabel(code) })),
          ]}
          onChange={(value) => update({ [PARAMS.action]: value || undefined })}
        />
        <DateRangePicker
          value={{ from, to }}
          onChange={(range) => update({ [PARAMS.from]: range.from, [PARAMS.to]: range.to })}
        />
      </FilterBar>

      <div className="flex flex-col">
        <AuditLogTable
          entries={data?.content}
          loading={log.isPending}
          error={log.isError}
          onRetry={() => void log.refetch()}
          empty={
            filtered
              ? { title: 'Hech narsa topilmadi', description: 'Filtrlarni oʻzgartirib koʻring' }
              : { title: 'Jurnal boʻsh', description: 'Harakatlar shu yerda koʻrinadi' }
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
