import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react'
import { Fragment, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { formatDateTime } from '../../shared/format'
import type { AuditEntry } from '../api/audit'
import { Avatar } from '../components/Avatar'
import { cx } from '../components/cx'
import { Skeleton } from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/States'
import { StatusBadge } from '../components/StatusBadge'
import {
  ACTOR_TYPE_LABELS,
  actionLabel,
  ENTITY_TYPE_LABELS,
  fieldLabel,
  formatAuditValue,
} from './labels'
import { entityPath } from './links'

function Who({ actor }: { actor: AuditEntry['actor'] }) {
  if (!actor?.name || actor.type === 'SYSTEM') {
    return (
      <span className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface">
          <Settings2 size={16} aria-hidden className="text-secondary" />
        </span>
        <span className="font-medium">Tizim</span>
      </span>
    )
  }
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={actor.name} />
      <span className="flex min-w-0 flex-col items-start gap-0.5">
        <span className="truncate font-medium">{actor.name}</span>
        {actor.type && <StatusBadge tone="neutral">{ACTOR_TYPE_LABELS[actor.type]}</StatusBadge>}
      </span>
    </span>
  )
}

function ObjectCell({ entry }: { entry: AuditEntry }) {
  const { type, id, label } = entry.entity
  const text = label ?? (type ? (ENTITY_TYPE_LABELS[type] ?? type) : '—')
  const to = entityPath(type, id)
  return to ? (
    <Link
      to={to}
      onClick={(event) => event.stopPropagation()}
      className="rounded-xs text-link hover:underline focus-visible:outline-2 focus-visible:outline-accent"
    >
      {text}
    </Link>
  ) : (
    <span>{text}</span>
  )
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-44 shrink-0 text-secondary">{label}</dt>
      <dd className="min-w-0 font-medium break-words text-primary">{children}</dd>
    </div>
  )
}

/** The expanded row: readable changes, the reason and the IP. Never raw JSON. */
export function AuditDetails({ entry }: { entry: AuditEntry }) {
  const type = entry.entity.type
  const nothing = !entry.reason && entry.changes.length === 0
  return (
    <div className="flex flex-col gap-1.5">
      <dl className="flex flex-col gap-1.5">
        {entry.reason && <Detail label="Sabab">{entry.reason}</Detail>}
        {entry.changes.map((change) => (
          <Detail key={change.field} label={fieldLabel(change.field)}>
            {formatAuditValue(change.field, change.oldValue, type)} →{' '}
            {formatAuditValue(change.field, change.newValue, type)}
          </Detail>
        ))}
      </dl>
      {nothing && (
        <p className="text-sm text-secondary">
          {entry.details
            ? 'Eski yozuv: oʻzgarishlar alohida saqlanmagan'
            : 'Qoʻshimcha maʼlumot yoʻq'}
        </p>
      )}
      {entry.ip && <p className="mt-1 text-xs text-secondary">IP: {entry.ip}</p>}
    </div>
  )
}

/**
 * Audit entries with an expand arrow per row. Used by Jurnal and by the
 * "Tarix" section of the detail pages (`compact` drops the object column
 * there, since every row is about the page's own object).
 */
export function AuditLogTable({
  entries,
  loading,
  error,
  onRetry,
  empty,
  compact = false,
}: {
  entries: AuditEntry[] | undefined
  loading: boolean
  error: boolean
  onRetry?: () => void
  empty: { title: string; description?: string }
  compact?: boolean
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const span = compact ? 4 : 5

  let body: ReactNode
  if (loading) {
    body = Array.from({ length: 6 }, (_, i) => (
      <tr key={i} className="h-14 border-b border-border last:border-b-0">
        {Array.from({ length: span }, (_, j) => (
          <td key={j} className="px-3 first:pl-5">
            <Skeleton className="h-3 w-3/5" />
          </td>
        ))}
      </tr>
    ))
  } else if (error) {
    body = (
      <tr>
        <td colSpan={span}>
          <ErrorState onRetry={onRetry} />
        </td>
      </tr>
    )
  } else if (!entries?.length) {
    body = (
      <tr>
        <td colSpan={span}>
          <EmptyState title={empty.title} description={empty.description} />
        </td>
      </tr>
    )
  } else {
    body = entries.map((entry) => {
      const open = expanded.has(entry.id)
      const detailsId = `audit-${entry.id}`
      return (
        <Fragment key={entry.id}>
          <tr
            onClick={() => toggle(entry.id)}
            className={cx(
              'h-14 cursor-pointer border-b border-border text-base text-primary hover:bg-hover',
              open && 'bg-hover',
            )}
          >
            <td className="px-3 pl-5 whitespace-nowrap">{formatDateTime(entry.time)}</td>
            <td className="px-3">
              <Who actor={entry.actor} />
            </td>
            <td className="px-3 font-medium">{actionLabel(entry.action)}</td>
            {!compact && (
              <td className="px-3">
                <ObjectCell entry={entry} />
              </td>
            )}
            <td className="w-12 pr-3 text-right">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={detailsId}
                aria-label={open ? 'Yopish' : 'Batafsil'}
                onClick={(event) => {
                  event.stopPropagation()
                  toggle(entry.id)
                }}
                className="rounded-xs p-1 text-secondary hover:text-primary focus-visible:outline-2 focus-visible:outline-accent"
              >
                {open ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
              </button>
            </td>
          </tr>
          {open && (
            <tr id={detailsId} className="border-b border-border bg-surface last:border-b-0">
              <td colSpan={span} className="py-3 pr-5 pl-18">
                <AuditDetails entry={entry} />
              </td>
            </tr>
          )}
        </Fragment>
      )
    })
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-background">
      <table className="w-full border-collapse" aria-busy={loading || undefined}>
        <thead>
          <tr className="h-11 border-b border-border bg-surface text-left text-xs font-semibold text-secondary">
            <th scope="col" className="w-44 px-3 pl-5">
              Sana va vaqt
            </th>
            <th scope="col" className="px-3">
              Kim
            </th>
            <th scope="col" className="w-72 px-3">
              Harakat
            </th>
            {!compact && (
              <th scope="col" className="w-64 px-3">
                Obyekt
              </th>
            )}
            <th className="w-12">
              <span className="sr-only">Batafsil</span>
            </th>
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  )
}
