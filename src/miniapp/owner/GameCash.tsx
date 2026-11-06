import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getGame, type GameDetail, type GameSide, type GameTeam } from '../api/games'
import { ownerGameKey } from '../api/owner'
import { Button, SkeletonBlock } from '../components'
import { formatMoney } from '../format'
import { teamRemainderState, teamRemaining } from '../games/teamMoney'
import { teamMarkActions, type MarkKind } from './marks'
import { MarkActionButtons, MarkChip, MarkedState } from './RemainderMark'

/**
 * A team game's booking (T10): each team's money from `GET /api/games/{id}` under
 * the booking sheet's own labels — "Ilovada toʻlangan", "Naqd olinadi" / "Naqd
 * olindi" — with the same marks as a booking: "Naqd olindi" and "Toʻlanmadi"
 * (confirmed by the parent), the marked state and its undo.
 */
export function GameTeamsMoney({
  gameId,
  undoing,
  onMark,
  onUndo,
}: {
  gameId: string
  /** The side whose undo is running. */
  undoing?: GameSide
  onMark: (kind: MarkKind, team: GameTeam, game: GameDetail) => void
  onUndo: (team: GameTeam) => void
}) {
  const { t } = useTranslation()
  const game = useQuery({ queryKey: ownerGameKey(gameId), queryFn: () => getGame(gameId) })
  if (game.isPending) return <SkeletonBlock />
  if (game.isError) {
    return (
      <Button variant="ghost" onClick={() => void game.refetch()}>
        {t('common.retry')}
      </Button>
    )
  }
  const teams = [...(game.data.teams ?? [])].sort((a, b) => a.side.localeCompare(b.side))
  if (teams.length === 0) return null
  return (
    <ul className="flex flex-col gap-2" aria-label={t('owner.gameCash.title')}>
      {teams.map((team) => {
        const name = team.teamName ?? t('team.anonymous')
        const state = teamRemainderState(team)
        const remaining = teamRemaining(team)
        // Every amount under its own label; the cash row is what the owner collects.
        const rows: Array<{ key: string; label: string; value: number }> = [
          { key: 'paidInApp', label: t('owner.booking.paidInApp'), value: team.paidInApp },
        ]
        if (state === 'cashReceived') {
          rows.push({
            key: 'cash',
            label: t('owner.booking.cashReceived'),
            value: team.remainderAmount,
          })
        } else if (remaining > 0) {
          rows.push({ key: 'cash', label: t('owner.booking.cashDue'), value: remaining })
        }
        return (
          <li
            key={team.side}
            aria-label={name}
            className="flex flex-col gap-2 rounded-xl bg-surface p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-md font-semibold text-primary">{name}</span>
              <MarkChip state={state} owed={remaining} besideAmount />
            </div>
            <dl className="flex flex-col gap-1 text-base">
              {rows.map(({ key, label, value }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <dt className="text-secondary">{label}</dt>
                  <dd className="text-primary">{formatMoney(value)}</dd>
                </div>
              ))}
            </dl>
            <MarkedState
              subject={team}
              cashAmount={team.remainderMark === 'cash_received' ? team.remainderAmount : undefined}
              undoing={undoing === team.side}
              onUndo={() => onUndo(team)}
            />
            <MarkActionButtons
              actions={teamMarkActions(team, game.data.status)}
              onMark={(kind) => onMark(kind, team, game.data)}
            />
          </li>
        )
      })}
    </ul>
  )
}
