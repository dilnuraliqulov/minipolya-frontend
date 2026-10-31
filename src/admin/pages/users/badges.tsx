import type { AdminUser } from '../../api/users'
import { StatusBadge } from '../../components/StatusBadge'
import { ROLE_LABELS } from '../../statuses'

/** Admin, Maydon egasi, or Oʻyinchi when neither. */
export function RoleBadges({ user }: { user: Pick<AdminUser, 'isAdmin' | 'isOwner'> }) {
  if (!user.isAdmin && !user.isOwner) {
    return <StatusBadge tone="neutral">{ROLE_LABELS.player}</StatusBadge>
  }
  return (
    <span className="flex flex-wrap gap-1.5">
      {user.isAdmin && <StatusBadge tone="accent">{ROLE_LABELS.admin}</StatusBadge>}
      {user.isOwner && <StatusBadge tone="neutral">{ROLE_LABELS.owner}</StatusBadge>}
    </span>
  )
}

export function UserStatusBadge({ blocked }: { blocked: boolean }) {
  return blocked ? (
    <StatusBadge tone="danger">Bloklangan</StatusBadge>
  ) : (
    <StatusBadge tone="success">Faol</StatusBadge>
  )
}
