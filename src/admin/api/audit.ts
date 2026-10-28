import { api, type Page } from '../../shared/api'

/**
 * The audit log — `GET /api/admin/audit-log` (api-reference §10.9, backend
 * ed5dec6). Read-only; newest first.
 */

export type AuditActorType = 'ADMIN' | 'OWNER' | 'PLAYER' | 'SYSTEM'

/** A JSON value as normalised by the backend's `AuditChange`. */
export type AuditValue = string | number | boolean | null | AuditValue[]

export interface AuditChange {
  field: string
  /** Absent or null for a value that did not exist before (a creation). */
  oldValue?: AuditValue
  /** Absent or null for a value that is gone (a deletion). */
  newValue?: AuditValue
}

export interface AuditEntry {
  id: string
  /** UTC. */
  time: string
  /** Absent on an old system row; `id`/`name` absent for SYSTEM. */
  actor?: { id?: string; name?: string; type?: AuditActorType }
  action: string
  entity: { type?: string; id?: string; label?: string }
  changes: AuditChange[]
  reason?: string
  ip?: string
  /** Legacy free-form JSON on rows written before the structured columns. */
  details?: string
}

export interface AuditFilters {
  /** Name, username or phone of who did it. */
  actor?: string
  actorType?: AuditActorType
  actions?: string[]
  entityType?: string
  entityId?: string
  /** Tashkent `LocalDate`s, both inclusive. */
  from?: string
  to?: string
  page?: number
  size?: number
}

export function getAuditLog(filters: AuditFilters = {}): Promise<Page<AuditEntry>> {
  const { actions, actor, ...rest } = filters
  return api.get<Page<AuditEntry>>('/api/admin/audit-log', {
    query: {
      ...rest,
      actor: actor?.trim() || undefined,
      // The backend takes a comma-separated list.
      action: actions?.length ? actions.join(',') : undefined,
    },
  })
}

/** Every action code, for the filter dropdown. */
export function getAuditActions(): Promise<string[]> {
  return api.get<string[]>('/api/admin/audit-log/actions')
}
