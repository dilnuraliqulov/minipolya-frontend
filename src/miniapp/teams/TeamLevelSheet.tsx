import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '../api/errors'
import { MY_TEAMS_KEY, teamKey, updateTeamLevel, type TeamDetail } from '../api/teams'
import { BottomSheet, Button, useToast } from '../components'
import type { TeamLevel } from './level'
import { TeamLevelCards } from './TeamLevelCards'

/**
 * The captain changing how seriously the team plays — the same three cards the
 * team was created with, so the choice reads the same both times. Only the
 * captain ever sees it; the API refuses anyone else.
 */
export function TeamLevelSheet({
  team,
  open,
  onClose,
}: {
  team: TeamDetail
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [level, setLevel] = useState<TeamLevel | undefined>(team.level)
  const save = useMutation({
    mutationFn: (next: TeamLevel) => updateTeamLevel(team.id, next),
    onSuccess: () => {
      toast.show(t('team.levelSaved'), 'success')
      void queryClient.invalidateQueries({ queryKey: teamKey(team.id) })
      void queryClient.invalidateQueries({ queryKey: MY_TEAMS_KEY })
      onClose()
    },
    onError: (error) => toast.show(errorMessage(error), 'danger'),
  })

  return (
    <BottomSheet
      open={open}
      title={t('team.levelSheet.title')}
      onClose={() => {
        if (!save.isPending) onClose()
      }}
      actions={
        <Button
          haptic
          disabled={!level || level === team.level}
          loading={save.isPending}
          onClick={() => level && save.mutate(level)}
        >
          {t('team.levelSheet.save')}
        </Button>
      }
    >
      <TeamLevelCards value={level} onChange={setLevel} disabled={save.isPending} />
    </BottomSheet>
  )
}
