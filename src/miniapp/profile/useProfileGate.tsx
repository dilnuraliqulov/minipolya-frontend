import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type ReactNode } from 'react'
import { getMe, type User } from '../api/users'
import { isProfileComplete } from './profile'
import { ME_KEY } from './queries'
import { ProfileSetupSheet } from './ProfileSetupSheet'

/**
 * Guards a flow (the first booking) behind "Profilingizni toʻldiring":
 *
 *   const gate = useProfileGate()
 *   <Button onClick={() => gate.require(startBooking)} />
 *   {gate.sheet}
 *
 * A complete profile goes straight on; otherwise the sheet asks first and
 * the flow continues once it is saved. The profile is loaded if needed; if
 * that fails the flow does not start (the caller's screen shows its error).
 */
export function useProfileGate(): {
  require: (proceed: () => void) => Promise<void>
  sheet: ReactNode
} {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const pending = useRef<(() => void) | null>(null)

  const require = async (proceed: () => void) => {
    let current: User
    try {
      current = await queryClient.ensureQueryData({ queryKey: ME_KEY, queryFn: getMe })
    } catch {
      return
    }
    if (isProfileComplete(current)) return proceed()
    pending.current = proceed
    setUser(current)
  }

  const close = () => {
    pending.current = null
    setUser(null)
  }

  const sheet = user ? (
    <ProfileSetupSheet
      user={user}
      onClose={close}
      onSaved={() => {
        const proceed = pending.current
        close()
        proceed?.()
      }}
    />
  ) : null

  return { require, sheet }
}
