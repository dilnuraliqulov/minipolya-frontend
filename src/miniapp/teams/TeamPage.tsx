import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ellipsis, Plus, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { errorMessage } from '../api/errors'
import {
  deleteTeam,
  leaveTeam,
  MY_TEAMS_KEY,
  removeTeamMember,
  teamKey,
  type Team,
  type TeamDetail,
  type TeamMember,
} from '../api/teams'
import { useLoginUser } from '../auth/sessionContext'
import {
  Badge,
  BottomSheet,
  Button,
  ButtonLink,
  Card,
  cx,
  EmptyState,
  ErrorState,
  SkeletonList,
  useToast,
} from '../components'
import { TabScreen } from '../layout/TabScreen'
import { ChallengeBoard } from './ChallengeBoard'
import { InviteSheet } from './InviteSheet'
import { useMyTeams, useTeam } from './queries'
import { TeamAvatar } from './TeamAvatar'
import { TeamInviteCard } from './TeamInviteCard'
import { TeamLevelBadge } from './TeamLevelBadge'
import { TeamLevelSheet } from './TeamLevelSheet'
import { TeamNextGameCard } from './TeamNextGameCard'

/** Jamoam: the player's teams, their next game, their members and the challenge board. */
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
          description={`${t('team.emptyText')} ${t('team.emptyHow')}`}
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
  const [inviting, setInviting] = useState(false)
  const [levelling, setLevelling] = useState(false)
  const [acting, setActing] = useState<TeamMember | null>(null)
  const [removing, setRemoving] = useState<TeamMember | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const nameOf = (member: TeamMember) => member.userName ?? t('team.anonymous')

  return (
    <>
      <Card className="flex items-center gap-3 p-4">
        <TeamAvatar name={team.name} id={team.id} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="truncate text-xl font-bold text-primary">{team.name}</h2>
          <p className="truncate text-sm text-secondary">
            {`${t('team.memberCount', { count: team.members.length })} · ${t('team.captain', {
              name: team.leaderName ?? t('team.anonymous'),
            })}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <TeamLevelBadge level={team.level} />
          <Badge tone={isLeader ? 'accent' : 'neutral'}>
            {isLeader ? t('team.leader') : t('team.member')}
          </Badge>
        </div>
      </Card>

      {isLeader && !team.level && (
        <button
          type="button"
          onClick={() => setLevelling(true)}
          className="flex min-h-11 flex-col gap-1 rounded-xl border border-warning-text bg-warning-soft p-4 text-left"
        >
          <span className="text-base font-semibold text-warning-text">
            {t('team.levelBanner.title')}
          </span>
          <span className="text-sm text-warning-text">{t('team.levelBanner.text')}</span>
          <span className="pt-1 text-sm font-semibold text-warning-text underline">
            {t('team.levelBanner.action')}
          </span>
        </button>
      )}

      {team.upcomingGame && <TeamNextGameCard game={team.upcomingGame} />}

      {isLeader && <TeamInviteCard onOpen={() => setInviting(true)} />}

      {isLeader ? (
        <ButtonLink to="/opponent">{t('team.findOpponent')}</ButtonLink>
      ) : (
        <p className="text-sm text-secondary">{t('team.leaderCreatesGames')}</p>
      )}

      <TeamStats team={team} />

      <section className="flex flex-col gap-3" aria-labelledby="members-title">
        <h3 id="members-title" className="text-lg font-semibold text-primary">
          {t('team.membersCount', { count: team.members.length })}
        </h3>
        <Card className="p-0">
          <ul aria-label={t('team.members')} className="divide-y divide-border">
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
      </section>

      <ChallengeBoard acceptAs={isLeader ? team.id : undefined} myLevel={team.level} />

      {isLeader ? (
        <>
          <Button variant="secondary" onClick={() => setLevelling(true)}>
            {t('team.levelSheet.title')}
          </Button>
          <Button variant="danger-outline" onClick={() => setDeleting(true)}>
            {t('team.delete')}
          </Button>
        </>
      ) : (
        <Button variant="danger-outline" onClick={() => setLeaving(true)}>
          {t('team.leave')}
        </Button>
      )}

      {isLeader && (
        <InviteSheet
          teamId={team.id}
          teamName={team.name}
          open={inviting}
          onClose={() => setInviting(false)}
        />
      )}
      {isLeader && levelling && (
        <TeamLevelSheet team={team} open onClose={() => setLevelling(false)} />
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
      {leaving && <LeaveTeamSheet team={team} onClose={() => setLeaving(false)} />}
      {deleting && <DeleteTeamSheet team={team} onClose={() => setDeleting(false)} />}
    </>
  )
}

/**
 * What the team has done, from the API and nowhere else: a figure the backend
 * did not send is simply not shown. Nothing here is counted or estimated.
 */
function TeamStats({ team }: { team: TeamDetail }) {
  const { t } = useTranslation()
  const stats: Array<{ label: string; value: number }> = []
  if (team.gamesPlayed !== undefined) {
    stats.push({ label: t('team.stats.played'), value: team.gamesPlayed })
  }
  stats.push({ label: t('team.stats.upcoming'), value: team.upcomingGame ? 1 : 0 })
  if (team.gamesPlayed === undefined) return null
  return (
    <Card className="flex divide-x divide-border">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-1 flex-col items-center gap-1 px-2 py-3">
          <span className="text-2xl font-bold text-primary">{stat.value}</span>
          <span className="text-center text-xs text-secondary">{stat.label}</span>
        </div>
      ))}
    </Card>
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

/** A member walking out of a team — their own decision, confirmed once. */
function LeaveTeamSheet({ team, onClose }: { team: TeamDetail; onClose: () => void }) {
  const { t } = useTranslation()
  const me = useLoginUser()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [, setSearch] = useSearchParams()
  const leave = useMutation({
    mutationFn: () => leaveTeam(team.id, me.id),
    onSuccess: () => {
      toast.show(t('team.left'), 'success')
      // Drop it from the list first, so the page moves on before anything refetches it.
      queryClient.setQueryData<Team[]>(MY_TEAMS_KEY, (old) => old?.filter((x) => x.id !== team.id))
      void queryClient.invalidateQueries({ queryKey: MY_TEAMS_KEY })
      setSearch({}, { replace: true })
      onClose()
    },
    onError: (error) => toast.show(errorMessage(error), 'danger'),
  })
  return (
    <BottomSheet
      open
      title={t('team.leaveTitle')}
      subtitle={t('team.leaveText', { name: team.name })}
      onClose={() => {
        if (!leave.isPending) onClose()
      }}
      actions={
        <>
          <Button variant="danger" loading={leave.isPending} onClick={() => leave.mutate()}>
            {t('team.leaveConfirm')}
          </Button>
          <Button variant="secondary" disabled={leave.isPending} onClick={onClose}>
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
      // Drop it from the list first, so the page moves on before anything refetches it.
      queryClient.setQueryData<Team[]>(MY_TEAMS_KEY, (old) => old?.filter((x) => x.id !== team.id))
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
