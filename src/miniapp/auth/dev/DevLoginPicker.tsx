/*
 * Developer tool for testing in a plain browser. It is only imported behind
 * `import.meta.env.DEV` in AuthGate, so it never ships; its strings are
 * therefore deliberately NOT translated.
 */
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useSession } from '../sessionContext'
import { devLogin, listDevUsers, type DevUser } from './devAuth'

function tags(user: DevUser): string[] {
  return [user.isOwner && 'owner', user.isAdmin && 'admin', user.isBlocked && 'blocked'].filter(
    (tag): tag is string => Boolean(tag),
  )
}

export default function DevLoginPicker() {
  const session = useSession()
  const [error, setError] = useState<string | null>(null)
  const users = useQuery({ queryKey: ['dev-users'], queryFn: listDevUsers, retry: false })

  const pick = (user: DevUser) => {
    setError(null)
    devLogin(user.id)
      .then(({ token, user: me }) => session.adopt(token, me))
      .catch(() => setError('Dev login failed'))
  }

  return (
    <div className="flex w-full flex-col gap-2 text-left">
      <p className="text-sm font-semibold text-secondary">Dev sign-in</p>
      {users.isPending && <p className="text-sm text-secondary">Loading…</p>}
      {users.isError && (
        <p className="text-sm text-danger">
          Could not load dev users (backend dev profile and key?)
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      {users.data?.map((user) => (
        <button
          key={user.id}
          type="button"
          onClick={() => pick(user)}
          className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-surface px-3 text-md text-primary"
        >
          <span className="truncate">{user.name}</span>
          <span className="text-xs text-secondary">{tags(user).join(' · ')}</span>
        </button>
      ))}
    </div>
  )
}
