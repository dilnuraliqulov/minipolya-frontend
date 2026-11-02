import { useQuery } from '@tanstack/react-query'
import { Banknote } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getGame, type GameTeam } from '../api/games'
import { ownerGameKey } from '../api/owner'
import { Button, SkeletonBlock } from '../components'
import { formatMoney } from '../format'

/**
 * A team game's booking: each team's remainder, from `GET /api/games/{id}`,
 * with "Naqd olindi" for a team that still owes (`POST /api/games/{id}/cash`).
 */
export function GameCash({ gameId, onCash }: { gameId: string; onCash: (team: GameTeam) => void }) {
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
  const teams = game.data.teams ?? []
  if (teams.length === 0) return null
  return (
    <ul className="flex flex-col gap-2" aria-label={t('owner.gameCash.title')}>
      {teams.map((team) => {
        const name = team.teamName ?? t('team.anonymous')
        const owes = team.remainderStatus !== 'paid' && team.remainderAmount > 0
        return (
          <li key={team.side} className="flex flex-col gap-2 rounded-xl bg-surface p-3">
            <span className="text-sm text-primary">
              {owes
                ? t('owner.gameCash.owes', {
                    team: name,
                    amount: formatMoney(team.remainderAmount),
                  })
                : t('owner.gameCash.paid', { team: name })}
            </span>
            {owes && (
              <Button variant="secondary" icon={Banknote} onClick={() => onCash(team)}>
                {t('owner.gameCash.button', { amount: formatMoney(team.remainderAmount) })}
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
