import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, Link2Off, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { ApiError } from '../../shared/api'
import { errorMessage } from '../api/errors'
import { getInvitePreview, invitePreviewKey, joinTeam, MY_TEAMS_KEY } from '../api/teams'
import {
  BottomBar,
  Button,
  Card,
  ErrorState,
  Header,
  Screen,
  SkeletonList,
  StateView,
} from '../components'
import { useGoBack } from '../lib/useGoBack'
import { TeamAvatar } from './TeamAvatar'

const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404
const isConflict = (error: unknown) => error instanceof ApiError && error.status === 409

/**
 * "Jamoaga qoʻshilish": opened from a team invite link (`startapp=team_<code>`
 * → /join/<code>). Shows the team, then joined / already a member / invalid.
 */
export function JoinTeamPage() {
  const { t } = useTranslation()
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  const queryClient = useQueryClient()
  const preview = useQuery({
    queryKey: invitePreviewKey(code),
    queryFn: () => getInvitePreview(code),
  })
  const join = useMutation({
    mutationFn: () => joinTeam(code),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: MY_TEAMS_KEY }),
  })
  const header = <Header title={t('team.join.title')} onBack={goBack} />
  const toTeam = (teamId: string) => navigate(`/team?team=${teamId}`, { replace: true })

  if (preview.isPending) {
    return (
      <Screen header={header}>
        <SkeletonList count={2} />
      </Screen>
    )
  }
  if (preview.isError && !isNotFound(preview.error)) {
    return (
      <Screen header={header}>
        <ErrorState onRetry={() => void preview.refetch()} />
      </Screen>
    )
  }

  const invalid = isNotFound(preview.error) || isNotFound(join.error)
  const team = preview.data?.team
  const alreadyMember = preview.data?.isMember || isConflict(join.error)

  let body
  let footer
  if (invalid || !team) {
    body = (
      <StateView
        icon={Link2Off}
        tone="danger"
        title={t('team.join.invalidTitle')}
        description={t('team.join.invalidText')}
      />
    )
    footer = (
      <Button variant="secondary" onClick={() => navigate('/', { replace: true })}>
        {t('team.join.home')}
      </Button>
    )
  } else if (join.isSuccess || alreadyMember) {
    body = join.isSuccess ? (
      <StateView
        icon={CircleCheck}
        title={t('team.join.joinedTitle')}
        description={t('team.join.joinedText', { team: team.name })}
      />
    ) : (
      <StateView
        icon={Users}
        title={t('team.join.memberTitle')}
        description={t('team.join.memberText', { team: team.name })}
      />
    )
    footer = (
      <Button haptic onClick={() => toTeam(team.id)}>
        {t('team.join.toTeam')}
      </Button>
    )
  } else {
    body = (
      <>
        <p className="text-center text-base text-secondary">{t('team.join.invited')}</p>
        <Card className="flex flex-col items-center gap-3 p-6">
          <TeamAvatar name={team.name} />
          <p className="text-center text-2xl font-bold text-primary">{team.name}</p>
          <p className="text-center text-sm text-secondary">
            {[
              team.leaderName && t('team.join.leader', { name: team.leaderName }),
              team.memberCount !== undefined && t('team.join.members', { count: team.memberCount }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </Card>
        {join.isError && (
          <p className="text-center text-sm text-danger">{errorMessage(join.error)}</p>
        )}
      </>
    )
    footer = (
      <>
        <Button haptic loading={join.isPending} onClick={() => join.mutate()}>
          {t('team.join.join')}
        </Button>
        <Button variant="ghost" disabled={join.isPending} onClick={goBack}>
          {t('team.join.later')}
        </Button>
      </>
    )
  }

  return (
    <Screen header={header} footer={<BottomBar>{footer}</BottomBar>} className="justify-center">
      {body}
    </Screen>
  )
}
