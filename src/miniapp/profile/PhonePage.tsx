import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '../api/errors'
import { updateMe, type User } from '../api/users'
import {
  BottomBar,
  Button,
  Card,
  ErrorState,
  Header,
  Input,
  Screen,
  SkeletonList,
  useToast,
} from '../components'
import { useGoBack } from '../lib/useGoBack'
import { formatPhone, formatPhoneInput, isCompletePhone, toWirePhone } from './phone'
import { ME_KEY, useMe } from './queries'
import { useSharePhone } from './useSharePhone'

/**
 * Profil → Telefon raqam. Inside Telegram, "Raqamni ulashish" asks Telegram to
 * share the contact with the bot, which saves it (backend `PHONE_SHARED_VIA_BOT`);
 * the app then re-reads /users/me. The number Telegram hands the page is never
 * used. Or the user types it: PATCH /api/users/me `{ phone }`.
 */
export function PhonePage() {
  const { t } = useTranslation()
  const goBack = useGoBack('/profile')
  const me = useMe()
  const header = <Header title={t('profile.phone')} onBack={goBack} />
  if (me.isPending) {
    return (
      <Screen header={header}>
        <SkeletonList count={2} />
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
  return <PhoneForm user={me.data} header={header} />
}

function PhoneForm({ user, header }: { user: User; header: React.ReactNode }) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [value, setValue] = useState(formatPhoneInput(user.phone ?? ''))
  const [error, setError] = useState<string | undefined>()
  const { canShare, waiting, share } = useSharePhone(user.phone, (fresh) =>
    setValue(formatPhoneInput(fresh.phone ?? '')),
  )

  const save = useMutation({
    mutationFn: (phone: string) => updateMe({ phone }),
    onSuccess: (saved) => {
      queryClient.setQueryData(ME_KEY, saved)
      toast.show(t('profile.saved'))
    },
  })

  const submit = () => {
    if (!isCompletePhone(value)) {
      setError(t('profile.phoneInvalid'))
      return
    }
    setError(undefined)
    save.mutate(toWirePhone(value))
  }

  return (
    <Screen
      header={header}
      footer={
        <BottomBar>
          <Button haptic loading={save.isPending} disabled={waiting} onClick={submit}>
            {t('profile.save')}
          </Button>
        </BottomBar>
      }
    >
      {user.phone && (
        <p className="text-base text-secondary">
          {t('phonePage.current', { phone: formatPhone(user.phone) })}
        </p>
      )}
      {canShare && (
        <>
          <Card className="flex flex-col gap-3 p-4">
            <p className="text-md font-semibold text-primary">{t('phonePage.shareTitle')}</p>
            <p className="text-sm text-secondary">{t('phonePage.shareText')}</p>
            <Button haptic loading={waiting} onClick={share}>
              <Send size={18} aria-hidden />
              {t('phonePage.share')}
            </Button>
          </Card>
          <p className="text-center text-sm text-secondary">{t('phonePage.or')}</p>
        </>
      )}
      <Input
        label={t('profile.phone')}
        placeholder="+998 __ ___ __ __"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={value}
        onChange={(event) => setValue(formatPhoneInput(event.target.value))}
        error={error ?? (save.error ? errorMessage(save.error) : undefined)}
        hint={t('profile.phoneHint')}
        disabled={save.isPending || waiting}
      />
    </Screen>
  )
}
