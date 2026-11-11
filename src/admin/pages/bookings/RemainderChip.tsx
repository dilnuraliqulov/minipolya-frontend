import { formatSom } from '../../../shared/format'
import { remainderState } from '../../../shared/payments/remainder'
import type { AdminBooking } from '../../api/bookings'
import { StatusBadge } from '../../components/StatusBadge'
import { REMAINDER_CHIPS } from '../../statuses'

/**
 * Design E10: Toʻliq toʻlangan · Naqd olindi · Toʻlanmadi · Qoldiq: X — from the
 * booking's own fields. A team game's remainders are its teams' (the game panel).
 */
export function RemainderChip({ booking }: { booking: AdminBooking }) {
  if (booking.gameId) return null
  const state = remainderState(booking)
  if (!state) return null
  const chip = REMAINDER_CHIPS[state]
  return (
    <StatusBadge tone={chip.tone}>
      {state === 'remainder' ? `${chip.label}: ${formatSom(booking.remainingAmount)}` : chip.label}
    </StatusBadge>
  )
}
