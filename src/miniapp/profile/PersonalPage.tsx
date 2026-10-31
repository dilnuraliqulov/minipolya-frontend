import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import type { User } from '../api/users'
import { errorMessage } from '../api/errors'
import {
  BottomBar,
  Button,
  ErrorState,
  Header,
  Screen,
  SkeletonList,
  useToast,
} from '../components'
import { ProfileFields } from './ProfileFields'
import { useMe } from './queries'
import { useProfileForm } from './useProfileForm'

/** Profil → Shaxsiy maʼlumotlar: first name, last name and phone (saving needs R20). */
export function PersonalPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const me = useMe()
  const header = <Header title={t('profile.personal')} onBack={() => navigate(-1)} />

  if (me.isPending) {
    return (
      <Screen header={header}>
        <SkeletonList count={1} />
      </Screen>
    )
  }
  if (me.isError) {
    return (
      <Screen header={header}>
        <ErrorState onRetry={() => void me.refetch()} />
      </Screen>
    )
  }
  return <PersonalForm user={me.data} header={header} />
}

function PersonalForm({ user, header }: { user: User; header: React.ReactNode }) {
  const { t } = useTranslation()
  const toast = useToast()
  const form = useProfileForm(user, () => toast.show(t('profile.saved')))
  return (
    <Screen
      header={header}
      footer={
        <BottomBar>
          <Button haptic disabled={!form.available} loading={form.saving} onClick={form.submit}>
            {t('profile.save')}
          </Button>
        </BottomBar>
      }
    >
      <ProfileFields form={form} layout="page" />
      {form.saveError && <p className="text-sm text-danger">{errorMessage(form.saveError)}</p>}
      <p className="text-xs text-secondary">{t('profile.notFromTelegram')}</p>
    </Screen>
  )
}
