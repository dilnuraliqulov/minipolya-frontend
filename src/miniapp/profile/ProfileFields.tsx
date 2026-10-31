import { useTranslation } from 'react-i18next'
import { Input } from '../components'
import type { ProfileForm } from './useProfileForm'

/** Ism + Familiya side by side (sheet) or stacked (page), then the phone. */
export function ProfileFields({ form, layout }: { form: ProfileForm; layout: 'sheet' | 'page' }) {
  const { t } = useTranslation()
  const { fields, errors, available } = form
  const disabled = !available || form.saving
  return (
    <>
      <div className={layout === 'sheet' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-4'}>
        <Input
          label={t('profile.firstName')}
          placeholder={t('profile.firstName')}
          autoComplete="given-name"
          value={fields.firstName}
          onChange={(event) => fields.setFirstName(event.target.value)}
          error={errors.firstName}
          disabled={disabled}
          maxLength={60}
        />
        <Input
          label={t('profile.lastName')}
          placeholder={t('profile.lastName')}
          autoComplete="family-name"
          value={fields.lastName}
          onChange={(event) => fields.setLastName(event.target.value)}
          error={errors.lastName}
          disabled={disabled}
          maxLength={60}
        />
      </div>
      <Input
        label={t('profile.phone')}
        placeholder="+998 __ ___ __ __"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={fields.phone}
        onChange={(event) => fields.setPhone(event.target.value)}
        error={errors.phone}
        hint={t('profile.phoneHint')}
        disabled={disabled}
      />
      {!available && (
        <p className="rounded-lg bg-warning-soft p-3 text-sm text-warning">
          {t('profile.soonNotice')}
        </p>
      )}
    </>
  )
}
