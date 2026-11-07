import { Banknote, CircleX, Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatTime } from '../../shared/format'
import { remainderState, type RemainderState } from '../../shared/payments/remainder'
import type { Booking } from '../api/bookings'
import type { GameTeam } from '../api/games'
import { Badge, BottomSheet, Button, type BadgeTone } from '../components'
import { formatMoney } from '../format'
import { bookingWho } from './bookingWho'
import { teamRemaining } from '../games/teamMoney'
import { canUndoMark, lastMinute, markActions, type MarkKind } from './marks'

/**
 * Design E5–E8/E10: the owner's "Naqd olindi" / "Toʻlanmadi" marks on what a
 * booking — or one team of a team game (T10) — still owes: the status chip, the
 * confirmation sheets, the marked state with its undo, shared by Jadval and
 * Hisobot. Every rule (who may mark, until when it can be undone) is the server's;
 * the client only shows its answers.
 */

const TONES: Record<RemainderState, BadgeTone> = {
  paidInFull: 'success',
  cashReceived: 'success',
  notPaid: 'danger',
  remainder: 'warning',
}

/**
 * The chip for one state: "Toʻliq toʻlangan" · "Naqd olindi" · "Toʻlanmadi" ·
 * "Naqd olinadi: X". `besideAmount`: it sits on a cash row whose label already says
 * "Naqd olinadi" / "Naqd olindi" with the amount, so those two are left out.
 */
export function MarkChip({
  state,
  owed,
  besideAmount = false,
}: {
  state: RemainderState | null
  /** Tiyin, for "Naqd olinadi: X". */
  owed: number
  besideAmount?: boolean
}) {
  const { t } = useTranslation()
  if (!state || (besideAmount && (state === 'remainder' || state === 'cashReceived'))) return null
  return (
    <Badge tone={TONES[state]}>
      {state === 'remainder'
        ? t('owner.mark.chip.remainder', { amount: formatMoney(owed) })
        : t(`owner.mark.chip.${state}`)}
    </Badge>
  )
}

/** A booking's chip — or nothing. */
export function RemainderChip({
  booking,
  besideAmount = false,
  owed = false,
}: {
  booking: Booking
  besideAmount?: boolean
  /** In the unpaid list: a booking with no mark state (a team game, a hold) still shows what it owes. */
  owed?: boolean
}) {
  const marked = booking.gameId ? null : remainderState(booking)
  // A team game's remainders are the teams' own (GameTeamsMoney), not the booking's.
  const state = !marked && owed && booking.remainingAmount > 0 ? 'remainder' : marked
  return <MarkChip state={state} owed={booking.remainingAmount} besideAmount={besideAmount} />
}

const MARK_BUTTON = 'flex-1 whitespace-nowrap'

/**
 * "Naqd olindi" and "Toʻlanmadi", side by side, as the actions allow; on a narrow
 * card (a team inside the booking sheet at 360px) they stack instead of breaking a label.
 */
export function MarkActionButtons({
  actions,
  onMark,
}: {
  actions: MarkKind[]
  onMark: (kind: MarkKind) => void
}) {
  const { t } = useTranslation()
  if (actions.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {actions.includes('cash') && (
        <Button
          variant="secondary"
          icon={Banknote}
          block={false}
          className={MARK_BUTTON}
          onClick={() => onMark('cash')}
        >
          {t('owner.mark.cash')}
        </Button>
      )}
      {actions.includes('notPaid') && (
        <Button
          variant="danger-outline"
          icon={CircleX}
          block={false}
          className={MARK_BUTTON}
          onClick={() => onMark('notPaid')}
        >
          {t('owner.mark.notPaid')}
        </Button>
      )}
    </div>
  )
}

/** A booking's buttons, as `markActions` allows. */
export function MarkButtons({
  booking,
  onMark,
}: {
  booking: Booking
  onMark: (kind: MarkKind) => void
}) {
  return <MarkActionButtons actions={markActions(booking)} onMark={onMark} />
}

/** The confirmation before either mark (design `z8Jb7L` / `gBjOn`), with its own words. */
function MarkConfirm({
  kind,
  subtitle,
  text,
  pending,
  onConfirm,
  onClose,
}: {
  kind: MarkKind
  subtitle: string
  text: string
  pending: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <BottomSheet
      open
      title={kind === 'cash' ? t('owner.gameCash.confirmTitle') : t('owner.mark.notPaidTitle')}
      subtitle={subtitle}
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
      <p className="text-sm text-secondary">{text}</p>
    </BottomSheet>
  )
}

/** A booking's confirmation. */
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
    who: bookingWho(booking, t),
    time: `${formatTime(booking.startsAt)}–${formatTime(booking.endsAt)}`,
    stadium: stadiumName,
  })
  return (
    <MarkConfirm
      kind={kind}
      subtitle={
        kind === 'cash'
          ? t('owner.booking.cashConfirmText', { amount })
          : t('owner.mark.notPaidText', { amount })
      }
      text={`${about} ${kind === 'cash' ? t('owner.mark.cashNote') : t('owner.mark.notPaidNote')}`}
      pending={pending}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}

/** T10: one team's confirmation, for the team's remainder. */
export function TeamMarkConfirmSheet({
  kind,
  team,
  startsAt,
  endsAt,
  stadiumName,
  pending,
  onConfirm,
  onClose,
}: {
  kind: MarkKind
  team: GameTeam
  startsAt: string
  endsAt: string
  stadiumName: string
  pending: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const name = team.teamName ?? t('team.anonymous')
  const amount = formatMoney(teamRemaining(team))
  const about = t('owner.mark.about', {
    who: name,
    time: `${formatTime(startsAt)}–${formatTime(endsAt)}`,
    stadium: stadiumName,
  })
  return (
    <MarkConfirm
      kind={kind}
      subtitle={
        kind === 'cash'
          ? t('owner.gameCash.confirmText', { team: name, amount })
          : t('owner.mark.teamNotPaidText', { team: name, amount })
      }
      text={`${about} ${kind === 'cash' ? t('owner.mark.teamCashNote') : t('owner.mark.teamNotPaidNote')}`}
      pending={pending}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}

/**
 * The marked state (design `O32gmN` / `qFHqW`): what was marked and, while the
 * server allows it, "Bekor qilish". For a booking or a team (`remainderMark`,
 * `remainderMarkUndoableUntil`); `cashAmount` is what the cash mark took, when known.
 */
export function MarkedState({
  subject,
  cashAmount,
  undoing,
  onUndo,
}: {
  subject: { remainderMark?: string; remainderMarkUndoableUntil?: string }
  cashAmount?: number
  undoing: boolean
  onUndo: () => void
}) {
  const { t } = useTranslation()
  const mark = subject.remainderMark
  if (mark !== 'cash_received' && mark !== 'not_paid') return null
  const cash = mark === 'cash_received'
  const undoable = canUndoMark(subject)
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
          ? cashAmount
            ? t('owner.mark.cashMarkedAmount', { amount: formatMoney(cashAmount) })
            : t('owner.mark.cashMarked')
          : t('owner.mark.notPaidMarked')}
      </p>
      {undoable && subject.remainderMarkUndoableUntil ? (
        <>
          <p className="text-sm text-secondary">
            {t('owner.mark.undoUntil', { time: lastMinute(subject.remainderMarkUndoableUntil) })}
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
