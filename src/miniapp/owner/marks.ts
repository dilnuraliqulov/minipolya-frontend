import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { formatTime } from '../../shared/format'
import { remainderState } from '../../shared/payments/remainder'
import type { Booking } from '../api/bookings'
import { errorMessage } from '../api/errors'
import {
  markBookingCash,
  markBookingNotPaid,
  OWNER_SCHEDULE_KEY,
  statsKey,
  undoRemainderMark,
  unpaidKey,
} from '../api/owner'
import { useToast } from '../components'

/** The owner's remainder marks (design E5–E8): which apply, and the calls. UI in RemainderMark.tsx. */

/** The live statuses a remainder can be marked on (the hold of a pending booking is not). */
const MARKABLE = new Set(['confirmed', 'completed'])

export type MarkKind = 'cash' | 'notPaid'

/** Which mark buttons a booking offers: none, both, or only "Naqd olindi" (after "Toʻlanmadi"). */
export function markActions(booking: Booking): MarkKind[] {
  if (booking.gameId || !MARKABLE.has(booking.status)) return []
  const state = remainderState(booking)
  if (state === 'remainder') return ['cash', 'notPaid']
  if (state === 'notPaid') return ['cash']
  return []
}

/**
 * The last minute before an instant: "23:59" for the end of a day, whether the server
 * sends 23:59:59 or the next midnight.
 */
export function lastMinute(until: string): string {
  return formatTime(new Date(Date.parse(until) - 1).toISOString())
}

/** Whether the owner may still undo the booking's mark (`remainderMarkUndoableUntil` ahead). */
export function canUndoMark(booking: Booking, now = Date.now()): boolean {
  const until = booking.remainderMarkUndoableUntil
  return booking.remainderMark !== undefined && until !== undefined && Date.parse(until) > now
}

/**
 * The three calls, each refreshing what it changes: the schedule (every day of the
 * stadium), the unpaid list and the stats.
 */
export function useRemainderMarks(stadiumId: string) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: [...OWNER_SCHEDULE_KEY, stadiumId] })
    void queryClient.invalidateQueries({ queryKey: unpaidKey(stadiumId) })
    void queryClient.invalidateQueries({ queryKey: statsKey(stadiumId) })
  }
  const options = (done: string) => ({
    onSuccess: () => toast.show(done, 'success'),
    onError: (error: unknown) => toast.show(errorMessage(error), 'danger'),
    onSettled: refresh,
  })
  const cash = useMutation({
    mutationFn: (id: string) => markBookingCash(id),
    ...options(t('owner.booking.cashDone')),
  })
  const notPaid = useMutation({
    mutationFn: (id: string) => markBookingNotPaid(id),
    ...options(t('owner.mark.notPaidDone')),
  })
  const undo = useMutation({
    mutationFn: (id: string) => undoRemainderMark(id),
    ...options(t('owner.mark.undoDone')),
  })
  return { cash, notPaid, undo }
}
