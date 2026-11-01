import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ellipsis, Plus, Share2, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { errorMessage } from '../api/errors'
import { isAvailable } from '../api/missing'
import {
  deleteTeam,
  MY_TEAMS_KEY,
  removeTeamMember,
  TEAM_INVITE,
  teamKey,
  type TeamDetail,
  type TeamMember,
} from '../api/teams'
import { useLoginUser } from '../auth/sessionContext'
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  cx,
  EmptyState,
  ErrorState,
  SkeletonList,
  useToast,
} from '../components'
import { TabScreen } from '../layout/TabScreen'
import { ChallengeBoard } from './ChallengeBoard'
import { useMyTeams, useTeam } from './queries'
import { TeamAvatar } from './TeamAvatar'

/** Jamoam: the player's teams, their members and the challenge board. */
export function TeamPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const teams = useMyTeams()
  const newTeam = (
    <button
      type="button"
      aria-label={t('team.newTeam')}
      onClick={() => navigate('/team/new')}
      className="flex size-11 items-center justify-center text-link"
    >
      <Plus size={22} aria-hidden />
    </button>
  )

  if (teams.isPending) {
    return (
      <TabScreen title={t('tabs.team')}>
        <SkeletonList count={3} variant="item" />
      </TabScreen>
    )
  }
  if (teams.isError) {
    return (
      <TabScreen title={t('tabs.team')}>
        <ErrorState onRetry={() => void teams.refetch()} />
      </TabScreen>
    )
  }
  if (teams.data.length === 0) {
    return (
      <TabScreen title={t('tabs.team')}>
        <EmptyState
          icon={Users}
          title={t('team.emptyTitle')}
          description={t('team.emptyText')}
          actionLabel={t('team.create')}
          onAction={() => navigate('/team/new')}
        />
      </TabScreen>
    )
  }

  const selectedId =
    teams.data.find((team) => team.id === search.get('team'))?.id ?? teams.data[0]?.id
  return (
    <TabScreen title={t('tabs.team')} action={newTeam}>
      {teams.data.length > 1 && (
        <div
          role="tablist"
          aria-label={t('team.pick')}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]"
        >
          {teams.data.map((team) => {
            const selected = team.id === selectedId
            return (
              <button
                key={team.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSearch({ team: team.id }, { replace: true })}
                className={cx(
                  'flex min-h-11 shrink-0 items-center rounded-full px-4 text-base font-medium',
                  selected ? 'bg-accent text-on-accent' : 'bg-surface text-primary',
                )}
              >
                {team.name}
              </button>
            )
          })}
        </div>
      )}
      {selectedId && <TeamView id={selectedId} />}
    </TabScreen>
  )
}

function TeamView({ id }: { id: string }) {
  const team = useTeam(id)
  if (team.isPending) return <SkeletonList count={3} variant="item" />
  if (team.isError) return <ErrorState onRetry={() => void team.refetch()} />
  return <TeamContent team={team.data} />
}

function TeamContent({ team }: { team: TeamDetail }) {
  const { t } = useTranslation()
  const me = useLoginUser()
  const isLeader = team.leaderId === me.id
  const [acting, setActing] = useState<TeamMember | null>(null)
  const [removing, setRemoving] = useState<TeamMember | null>(null)
  const [deleting, setDeleting] = useState(false)
  const nameOf = (member: TeamMember) => member.userName ?? t('team.anonymous')

  return (
    <>
      <Card className="flex items-center gap-3 p-4">
        <TeamAvatar name={team.name} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="truncate text-xl font-bold text-primary">{team.name}</h2>
          <p className="text-sm text-secondary">
            {t('team.memberCount', { count: team.members.length })}
          </p>
        </div>
        <Badge tone={isLeader ? 'accent' : 'neutral'}>
          {isLeader ? t('team.leader') : t('team.member')}
        </Badge>
      </Card>

      <ChallengeBoard acceptAs={isLeader ? team.id : undefined} />

      <section className="flex flex-col gap-3" aria-labelledby="members-title">
        <h3 id="members-title" className="text-lg font-semibold text-primary">
          {t('team.members')}
        </h3>
        <Card className="p-0">
          <ul aria-labelledby="members-title" className="divide-y divide-border">
            {team.members.map((member) => (
              <li key={member.userId} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <TeamAvatar name={nameOf(member)} size="sm" />
                <span className="min-w-0 flex-1 truncate text-base text-primary">
                  {nameOf(member)}
                </span>
                {member.role === 'leader' && <Badge tone="accent">{t('team.leader')}</Badge>}
                {isLeader && member.userId !== me.id && (
                  <button
                    type="button"
                    aria-label={t('team.memberActions', { name: nameOf(member) })}
                    onClick={() => setActing(member)}
                    className="flex size-11 items-center justify-center text-secondary"
                  >
                    <Ellipsis size={20} aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
        <Button variant="secondary" icon={Share2} disabled={!isAvailable(TEAM_INVITE)}>
          {t('team.invite')}
        </Button>
        {!isAvailable(TEAM_INVITE) && (
          <p className="text-center text-xs text-secondary">{t('common.soon')}</p>
        )}
      </section>

      {isLeader && (
        <Button variant="danger-outline" onClick={() => setDeleting(true)}>
          {t('team.delete')}
        </Button>
      )}

      <BottomSheet
        open={acting !== null}
        title={acting ? t('team.memberActions', { name: nameOf(acting) }) : ''}
        onClose={() => setActing(null)}
      >
        <Button
          variant="danger-outline"
          onClick={() => {
            setRemoving(acting)
            setActing(null)
          }}
        >
          {t('team.remove')}
        </Button>
      </BottomSheet>
      {removing && (
        <RemoveMemberSheet team={team} member={removing} onClose={() => setRemoving(null)} />
      )}
      {deleting && <DeleteTeamSheet team={team} onClose={() => setDeleting(false)} />}
    </>
  )
}

function RemoveMemberSheet({
  team,
  member,
  onClose,
}: {
  team: TeamDetail
  member: TeamMember
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const name = member.userName ?? t('team.anonymous')
  const remove = useMutation({
    mutationFn: () => removeTeamMember(team.id, member.userId),
    onSuccess: () => {
      toast.show(t('team.removed'), 'success')
      void queryClient.invalidateQueries({ queryKey: teamKey(team.id) })
      void queryClient.invalidateQueries({ queryKey: MY_TEAMS_KEY })
      onClose()
    },
    onError: (error) => toast.show(errorMessage(error), 'danger'),
  })
  return (
    <BottomSheet
      open
      title={t('team.removeTitle', { name })}
      onClose={() => {
        if (!remove.isPending) onClose()
      }}
      actions={
        <>
          <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
            {t('team.removeConfirm')}
          </Button>
          <Button variant="secondary" disabled={remove.isPending} onClick={onClose}>
            {t('team.cancel')}
          </Button>
        </>
      }
    />
  )
}

function DeleteTeamSheet({ team, onClose }: { team: TeamDetail; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [, setSearch] = useSearchParams()
  const remove = useMutation({
    mutationFn: () => deleteTeam(team.id),
    onSuccess: () => {
      toast.show(t('team.deleted'), 'success')
      queryClient.removeQueries({ queryKey: teamKey(team.id) })
      void queryClient.invalidateQueries({ queryKey: MY_TEAMS_KEY })
      setSearch({}, { replace: true })
      onClose()
    },
    onError: (error) => toast.show(errorMessage(error), 'danger'),
  })
  return (
    <BottomSheet
      open
      title={t('team.deleteTitle')}
      subtitle={t('team.deleteText', { name: team.name })}
      onClose={() => {
        if (!remove.isPending) onClose()
      }}
      actions={
        <>
          <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
            {t('team.deleteConfirm')}
          </Button>
          <Button variant="secondary" disabled={remove.isPending} onClick={onClose}>
            {t('team.cancel')}
          </Button>
        </>
      }
    />
  )
}
