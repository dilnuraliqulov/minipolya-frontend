import { useSyncExternalStore } from 'react'

/**
 * Team games this player joined whose answer was 202 PAYMENT_PENDING: paid,
 * the other team's capture not settled yet. The challenge board still lists
 * such a game (it stays `open` until the backend finishes the join), so it
 * must not offer "Qabul qilish" — paying — again. In memory only, for this
 * launch: the backend's notification brings the outcome, and the game reads
 * fresh from the server whenever it is opened.
 */
const pending = new Set<string>()
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version++
  listeners.forEach((listener) => listener())
}

export function markJoinPending(gameId: string): void {
  if (pending.has(gameId)) return
  pending.add(gameId)
  emit()
}

export function isJoinPending(gameId: string): boolean {
  return pending.has(gameId)
}

/** Re-renders when the set changes; returns the check. */
export function usePendingJoins(): (gameId: string) => boolean {
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => version,
  )
  return isJoinPending
}

/** Tests only. */
export function resetPendingJoins(): void {
  pending.clear()
  emit()
}
