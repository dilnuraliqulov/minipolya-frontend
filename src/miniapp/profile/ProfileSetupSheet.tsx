import { useTranslation } from 'react-i18next'
import { errorMessage } from '../api/errors'
import type { User } from '../api/users'
import { BottomSheet, Button } from '../components'
import { ProfileFields } from './ProfileFields'
import { useProfileForm } from './useProfileForm'

/**
 * "Profilingizni toʻldiring" — asked before the first booking, never on app
 * start, never pre-filled from Telegram.
 */
export function ProfileSetupSheet({
  user,
  onClose,
  onSaved,
}: {
  user: User | undefined
  onClose: () => void
  onSaved: (user: User) => void
}) {
  const { t } = useTranslation()
  const form = useProfileForm(user, onSaved)
  return (
    <BottomSheet
      open
      title={t('profile.setupTitle')}
      subtitle={t('profile.setupSubtitle')}
      onClose={onClose}
      actions={
        <Button
          variant="secondary"
          haptic
          disabled={!form.available}
          loading={form.saving}
          onClick={form.submit}
        >
          {t('profile.continue')}
        </Button>
      }
    >
      <ProfileFields form={form} layout="sheet" />
      {form.saveError && <p className="text-sm text-danger">{errorMessage(form.saveError)}</p>}
    </BottomSheet>
  )
}
