import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '../api/errors'
import { getMe, updateMe, type User } from '../api/users'
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
import { getTelegramWebApp } from '../telegram'
import { formatPhone, formatPhoneInput, isCompletePhone, toWirePhone } from './phone'
import { ME_KEY, useMe } from './queries'

/** After the user agrees to share, the bot saves the phone; we look for it this often. */
const CONTACT_POLL_MS = 2_000
const CONTACT_POLL_TRIES = 5

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
  const [waiting, setWaiting] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const webApp = getTelegramWebApp()
  const canShare = Boolean(webApp?.requestContact && webApp.isVersionAtLeast('6.9'))

  useEffect(() => () => window.clearTimeout(timer.current), [])

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

  const share = () => {
    webApp?.requestContact?.((shared) => {
      if (!shared) return
      setWaiting(true)
      const before = user.phone
      let tries = 0
      const poll = async () => {
        tries += 1
        try {
          const fresh = await getMe()
          if (fresh.phone && fresh.phone !== before) {
            queryClient.setQueryData(ME_KEY, fresh)
            setValue(formatPhoneInput(fresh.phone))
            setWaiting(false)
            toast.show(t('phonePage.shared'))
            return
          }
        } catch {
          // A failed read is just another try.
        }
        if (tries < CONTACT_POLL_TRIES) timer.current = window.setTimeout(poll, CONTACT_POLL_MS)
        else {
          setWaiting(false)
          toast.show(t('phonePage.notReceived'), 'danger')
        }
      }
      timer.current = window.setTimeout(poll, CONTACT_POLL_MS)
    })
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
