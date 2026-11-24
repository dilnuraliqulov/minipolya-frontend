import { useTranslation } from 'react-i18next'
import { Badge } from '../components'
import { asTeamLevel, levelLabel, levelTone } from './level'

/**
 * A team's level wherever the team is shown: its page, a team card, a challenge
 * card, the accept screen, the game screen and the chat. A team that has no
 * level yet simply has no badge — nothing stands in for one.
 */
export function TeamLevelBadge({ level }: { level?: string }) {
  const { t } = useTranslation()
  const value = asTeamLevel(level)
  if (!value) return null
  return <Badge tone={levelTone(value)}>{levelLabel(t, value)}</Badge>
}
