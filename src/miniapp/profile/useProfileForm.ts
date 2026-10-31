import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isAvailable } from '../api/missing'
import { PROFILE_FIELDS, type User } from '../api/users'
import { formatPhone, formatPhoneInput, isCompletePhone, toWirePhone } from './phone'
import { useUpdateProfile } from './queries'

export interface ProfileFormErrors {
  firstName?: string
  lastName?: string
  phone?: string
}

/**
 * State for "Profilingizni toʻldiring" and Shaxsiy maʼlumotlar. Fields start
 * from what the USER entered (firstName, lastName, phone) — never from the
 * Telegram-filled `name`. Saving needs R20; until then `available` is false
 * and nothing is sent.
 */
export function useProfileForm(user: User | undefined, onSaved: (user: User) => void) {
  const { t } = useTranslation()
  const available = isAvailable(PROFILE_FIELDS)
  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [phone, setPhone] = useState(user?.phone ? formatPhone(user.phone) : '')
  const [errors, setErrors] = useState<ProfileFormErrors>({})
  const mutation = useUpdateProfile()

  const validate = (): ProfileFormErrors => {
    const next: ProfileFormErrors = {}
    if (!firstName.trim()) next.firstName = t('profile.firstNameRequired')
    if (!lastName.trim()) next.lastName = t('profile.lastNameRequired')
    if (!phone.replace(/\D/g, '').replace(/^998/, '')) next.phone = t('profile.phoneRequired')
    else if (!isCompletePhone(phone)) next.phone = t('profile.phoneInvalid')
    return next
  }

  const submit = () => {
    if (!available || mutation.isPending) return
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return
    mutation.mutate(
      { firstName: firstName.trim(), lastName: lastName.trim(), phone: toWirePhone(phone) },
      { onSuccess: onSaved },
    )
  }

  return {
    available,
    fields: {
      firstName,
      lastName,
      phone,
      setFirstName,
      setLastName,
      setPhone: (value: string) => setPhone(formatPhoneInput(value)),
    },
    errors,
    submit,
    saving: mutation.isPending,
    saveError: mutation.error,
  }
}

export type ProfileForm = ReturnType<typeof useProfileForm>
