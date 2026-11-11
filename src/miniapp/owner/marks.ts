import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { formatTime } from '../../shared/format'
import { remainderState } from '../../shared/payments/remainder'
import type { Booking } from '../api/bookings'
import { errorMessage } from '../api/errors'
import {
  markGameNotPaid,
  recordGameCash,
  undoGameRemainderMark,
  type GameDetail,
  type GameSide,
  type GameTeam,
} from '../api/games'
import {
  markBookingCash,
  markBookingNotPaid,
  OWNER_SCHEDULE_KEY,
  ownerGameKey,
  statsKey,
  undoRemainderMark,
  unpaidKey,
} from '../api/owner'
import { useToast } from '../components'
import { teamRemainderState } from '../games/teamMoney'

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

/** A confirmed (or played) team game; a waiting one has only holds, a cancelled one nothing. */
const MARKABLE_GAME = new Set(['confirmed', 'completed'])

/** T10: the same rule for one team of a team game (its remainder, its mark). */
export function teamMarkActions(team: GameTeam, gameStatus: string): MarkKind[] {
  if (!MARKABLE_GAME.has(gameStatus)) return []
  const state = teamRemainderState(team)
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

/** What carries a mark: a booking, or one team of a team game (T10). */
export interface Markable {
  remainderMark?: string
  remainderMarkUndoableUntil?: string
}

/** Whether the owner may still undo the mark (`remainderMarkUndoableUntil` ahead). */
export function canUndoMark(subject: Markable, now = Date.now()): boolean {
  const until = subject.remainderMarkUndoableUntil
  return subject.remainderMark !== undefined && until !== undefined && Date.parse(until) > now
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

/**
 * T10: the same three calls for one team of a team game (`POST /api/games/{id}/cash`,
 * `/not-paid`, `DELETE …/remainder-mark?side=`). Each answers the game, which replaces
 * the cached one; the schedule, the unpaid list and the stats refresh too.
 */
export function useGameTeamMarks(stadiumId: string, gameId: string) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const options = (done: string) => ({
    onSuccess: (game: GameDetail) => {
      queryClient.setQueryData(ownerGameKey(gameId), game)
      toast.show(done, 'success')
    },
    onError: (error: unknown) => toast.show(errorMessage(error), 'danger'),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ownerGameKey(gameId) })
      void queryClient.invalidateQueries({ queryKey: [...OWNER_SCHEDULE_KEY, stadiumId] })
      void queryClient.invalidateQueries({ queryKey: unpaidKey(stadiumId) })
      void queryClient.invalidateQueries({ queryKey: statsKey(stadiumId) })
    },
  })
  const cash = useMutation({
    mutationFn: (side: GameSide) => recordGameCash(gameId, side),
    ...options(t('owner.gameCash.done')),
  })
  const notPaid = useMutation({
    mutationFn: (side: GameSide) => markGameNotPaid(gameId, side),
    ...options(t('owner.mark.notPaidDone')),
  })
  const undo = useMutation({
    mutationFn: (side: GameSide) => undoGameRemainderMark(gameId, side),
    ...options(t('owner.mark.undoDone')),
  })
  return { cash, notPaid, undo }
}
