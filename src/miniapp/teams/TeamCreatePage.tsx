import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { errorMessage } from '../api/errors'
import { createTeam, MY_TEAMS_KEY } from '../api/teams'
import { BottomBar, Button, Header, Input, Screen, useToast } from '../components'
import { useGoBack } from '../lib/useGoBack'
import { TeamAvatar } from './TeamAvatar'

/** The design's hint: 3–24 characters (the API allows up to 100). */
const NAME_MIN = 3
const NAME_MAX = 24

/** Jamoa yaratish: a name; the creator becomes the captain. */
export function TeamCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const goBack = useGoBack('/team')
  const toast = useToast()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const trimmed = name.trim()
  const valid = trimmed.length >= NAME_MIN && trimmed.length <= NAME_MAX
  const create = useMutation({
    mutationFn: () => createTeam(trimmed),
    onSuccess: (team) => {
      toast.show(t('team.created'), 'success')
      void queryClient.invalidateQueries({ queryKey: MY_TEAMS_KEY })
      navigate(`/team?team=${team.id}`, { replace: true })
    },
    onError: (error) => toast.show(errorMessage(error), 'danger'),
  })

  return (
    <Screen
      header={<Header title={t('team.createTitle')} onBack={goBack} />}
      footer={
        <BottomBar>
          <Button
            haptic
            disabled={!valid}
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            {t('team.create')}
          </Button>
        </BottomBar>
      }
    >
      <p className="text-base text-secondary">{t('team.createIntro')}</p>
      <div className="flex justify-center py-4">
        <TeamAvatar name={trimmed || '?'} size="lg" />
      </div>
      <Input
        label={t('team.name')}
        value={name}
        maxLength={NAME_MAX}
        onChange={(event) => setName(event.target.value)}
        hint={t('team.nameHint')}
        trailing={<span className="text-xs text-secondary">{`${trimmed.length}/${NAME_MAX}`}</span>}
      />
    </Screen>
  )
}
