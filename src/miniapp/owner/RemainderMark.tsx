import { Banknote, CircleX, Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatTime } from '../../shared/format'
import { remainderState, type RemainderState } from '../../shared/payments/remainder'
import type { Booking } from '../api/bookings'
import { Badge, BottomSheet, Button, type BadgeTone } from '../components'
import { formatMoney } from '../format'
import { canUndoMark, lastMinute, markActions, type MarkKind } from './marks'

/**
 * Design E5–E8/E10: the owner's "Naqd olindi" / "Toʻlanmadi" marks on what a
 * booking still owes — the status chip, the confirmation sheets, the marked state
 * with its undo — shared by Jadval and Hisobot. Every rule (who may mark, until
 * when it can be undone) is the server's; the client only shows its answers.
 */

const TONES: Record<RemainderState, BadgeTone> = {
  paidInFull: 'success',
  cashReceived: 'success',
  notPaid: 'danger',
  remainder: 'warning',
}

/**
 * "Toʻliq toʻlangan" · "Naqd olindi" · "Toʻlanmadi" · "Naqd olinadi: X" — or nothing.
 * `besideAmount`: the chip sits on the sheet's cash row, whose label already says
 * "Naqd olinadi" / "Naqd olindi" with the amount, so those two are left out.
 */
export function RemainderChip({
  booking,
  besideAmount = false,
}: {
  booking: Booking
  besideAmount?: boolean
}) {
  const { t } = useTranslation()
  // A team game's remainders are the teams' own (GameCash), not the booking's.
  if (booking.gameId) return null
  const state = remainderState(booking)
  if (!state || (besideAmount && (state === 'remainder' || state === 'cashReceived'))) return null
  return (
    <Badge tone={TONES[state]}>
      {state === 'remainder'
        ? t('owner.mark.chip.remainder', { amount: formatMoney(booking.remainingAmount) })
        : t(`owner.mark.chip.${state}`)}
    </Badge>
  )
}

/** "Naqd olindi" and "Toʻlanmadi", side by side, as `markActions` allows. */
export function MarkButtons({
  booking,
  onMark,
}: {
  booking: Booking
  onMark: (kind: MarkKind) => void
}) {
  const { t } = useTranslation()
  const actions = markActions(booking)
  if (actions.length === 0) return null
  return (
    <div className="flex gap-2">
      {actions.includes('cash') && (
        <Button variant="secondary" icon={Banknote} onClick={() => onMark('cash')}>
          {t('owner.mark.cash')}
        </Button>
      )}
      {actions.includes('notPaid') && (
        <Button variant="danger-outline" icon={CircleX} onClick={() => onMark('notPaid')}>
          {t('owner.mark.notPaid')}
        </Button>
      )}
    </div>
  )
}

/** The confirmation before either mark (design `z8Jb7L` / `gBjOn`). */
export function MarkConfirmSheet({
  kind,
  booking,
  stadiumName,
  pending,
  onConfirm,
  onClose,
}: {
  kind: MarkKind
  booking: Booking
  stadiumName: string
  pending: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const amount = formatMoney(booking.remainingAmount)
  const about = t('owner.mark.about', {
    who: booking.clientName ?? t('owner.booking.player'),
    time: `${formatTime(booking.startsAt)}–${formatTime(booking.endsAt)}`,
    stadium: stadiumName,
  })
  return (
    <BottomSheet
      open
      title={kind === 'cash' ? t('owner.gameCash.confirmTitle') : t('owner.mark.notPaidTitle')}
      subtitle={
        kind === 'cash'
          ? t('owner.booking.cashConfirmText', { amount })
          : t('owner.mark.notPaidText', { amount })
      }
      onClose={() => {
        if (!pending) onClose()
      }}
      actions={
        <>
          <Button
            haptic
            variant={kind === 'cash' ? 'primary' : 'danger'}
            loading={pending}
            onClick={onConfirm}
          >
            {kind === 'cash' ? t('owner.gameCash.confirm') : t('owner.mark.notPaid')}
          </Button>
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            {t('owner.mark.back')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-secondary">
        {`${about} ${kind === 'cash' ? t('owner.mark.cashNote') : t('owner.mark.notPaidNote')}`}
      </p>
    </BottomSheet>
  )
}

/**
 * The marked state (design `O32gmN` / `qFHqW`): what was marked and, while the
 * server allows it, "Bekor qilish".
 */
export function MarkedState({
  booking,
  undoing,
  onUndo,
}: {
  booking: Booking
  undoing: boolean
  onUndo: () => void
}) {
  const { t } = useTranslation()
  const mark = booking.remainderMark
  if (mark !== 'cash_received' && mark !== 'not_paid') return null
  const cash = mark === 'cash_received'
  const undoable = canUndoMark(booking)
  return (
    <div
      className={
        cash
          ? 'flex flex-col gap-2 rounded-xl border border-success-text bg-background p-3'
          : 'flex flex-col gap-2 rounded-xl border border-danger-text bg-background p-3'
      }
    >
      {/* Neutral card + coloured border and icon: the text keeps its contrast in both themes. */}
      <p className="flex items-center gap-2 text-md font-semibold text-primary">
        {cash ? (
          <Banknote size={18} className="shrink-0 text-success-text" aria-hidden />
        ) : (
          <CircleX size={18} className="shrink-0 text-danger-text" aria-hidden />
        )}
        {cash
          ? booking.paidInCash
            ? t('owner.mark.cashMarkedAmount', { amount: formatMoney(booking.paidInCash) })
            : t('owner.mark.cashMarked')
          : t('owner.mark.notPaidMarked')}
      </p>
      {undoable && booking.remainderMarkUndoableUntil ? (
        <>
          <p className="text-sm text-secondary">
            {t('owner.mark.undoUntil', { time: lastMinute(booking.remainderMarkUndoableUntil) })}
          </p>
          <Button variant="ghost" icon={Undo2} block={false} loading={undoing} onClick={onUndo}>
            {t('owner.mark.undo')}
          </Button>
        </>
      ) : (
        <p className="text-sm text-secondary">{t('owner.mark.adminOnly')}</p>
      )}
    </div>
  )
}
