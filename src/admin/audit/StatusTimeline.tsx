import { formatDateTime } from '../../shared/format'
import type { AuditEntry } from '../api/audit'
import { cx } from '../components/cx'
import { Skeleton } from '../components/Skeleton'
import { timelineLabel } from './labels'

/** A vertical list of steps, oldest first: label, who (when not the system) and time. */
export function StatusTimeline({
  entries,
  loading,
  error,
}: {
  entries: AuditEntry[] | undefined
  loading: boolean
  error: boolean
}) {
  if (loading) return <Skeleton className="h-24 w-full rounded-md" />
  if (error) return <p className="text-sm text-danger">Tarixni yuklab boʻlmadi</p>
  if (!entries?.length) return <p className="text-sm text-secondary">Tarix yoʻq</p>
  return (
    <ol className="flex flex-col">
      {entries.map((entry, i) => {
        const last = i === entries.length - 1
        const who = entry.actor?.type !== 'SYSTEM' ? entry.actor?.name : undefined
        return (
          <li key={entry.id} className="flex gap-3">
            <span className="flex flex-col items-center">
              <span
                aria-hidden
                className={cx('mt-1.5 size-2.5 rounded-full', last ? 'bg-accent' : 'bg-border')}
              />
              {!last && <span aria-hidden className="w-px flex-1 bg-border" />}
            </span>
            <span className={cx('flex flex-col gap-0.5', !last && 'pb-3.5')}>
              <span className="text-base font-medium text-primary">
                {timelineLabel(entry.action)}
              </span>
              <span className="text-sm text-secondary">
                {formatDateTime(entry.time)}
                {who && ` · ${who}`}
              </span>
              {entry.reason && <span className="text-sm text-primary">{entry.reason}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
