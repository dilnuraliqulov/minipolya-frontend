import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '../api/errors'
import { getTeamInvite, inviteKey, renewTeamInvite } from '../api/teams'
import { BottomSheet, Button, ErrorState, SkeletonList, useToast } from '../components'
import { buildInviteLink, shareLink } from '../telegram'

/** The link for a code, or null when the bot / app names are not configured. */
function linkFor(code: string): string | null {
  try {
    return buildInviteLink(`team_${code}`)
  } catch {
    return null
  }
}

/**
 * "Taklif havolasi" (leader only, R32): the team's link with copy, share in
 * Telegram, and "Yangi havola yaratish" (the old link stops working).
 */
export function InviteSheet({
  teamId,
  teamName,
  open,
  onClose,
}: {
  teamId: string
  teamName: string
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const invite = useQuery({
    queryKey: inviteKey(teamId),
    queryFn: () => getTeamInvite(teamId),
    enabled: open,
  })
  const renew = useMutation({
    mutationFn: () => renewTeamInvite(teamId),
    onSuccess: (fresh) => {
      queryClient.setQueryData(inviteKey(teamId), fresh)
      toast.show(t('team.inviteSheet.renewed'))
    },
    onError: (error) => toast.show(errorMessage(error), 'danger'),
  })
  const link = invite.data ? linkFor(invite.data.code) : null

  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      toast.show(t('team.inviteSheet.copied'))
    } catch {
      toast.show(t('team.inviteSheet.copyFailed'), 'danger')
    }
  }

  return (
    <BottomSheet
      open={open}
      title={t('team.inviteSheet.title')}
      subtitle={t('team.inviteSheet.text')}
      onClose={onClose}
      actions={
        link ? (
          <>
            <Button
              haptic
              icon={Send}
              onClick={() => shareLink(link, t('team.inviteSheet.shareText', { team: teamName }))}
            >
              {t('team.inviteSheet.share')}
            </Button>
            <Button variant="ghost" loading={renew.isPending} onClick={() => renew.mutate()}>
              {t('team.inviteSheet.renew')}
            </Button>
          </>
        ) : undefined
      }
    >
      {invite.isPending ? (
        <SkeletonList count={1} />
      ) : invite.isError ? (
        <ErrorState onRetry={() => void invite.refetch()} />
      ) : link ? (
        <div className="flex h-12 items-center gap-2 rounded-xl border border-border bg-surface pr-1 pl-4">
          <span className="min-w-0 flex-1 truncate text-base text-primary">{link}</span>
          <button
            type="button"
            aria-label={t('team.inviteSheet.copy')}
            onClick={() => void copy()}
            className="flex size-11 shrink-0 items-center justify-center text-link"
          >
            <Copy size={20} aria-hidden />
          </button>
        </div>
      ) : (
        <p className="text-sm text-secondary">{t('team.inviteSheet.notConfigured')}</p>
      )}
    </BottomSheet>
  )
}
