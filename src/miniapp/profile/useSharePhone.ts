import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getMe, type User } from '../api/users'
import { useToast } from '../components'
import { getTelegramWebApp } from '../telegram'
import { ME_KEY } from './queries'

/** After the user agrees to share, the bot saves the phone; we look for it this often. */
const CONTACT_POLL_MS = 2_000
const CONTACT_POLL_TRIES = 5

/**
 * "Send my phone through Telegram": asks Telegram to share the contact with the
 * bot, then re-reads the profile until the bot has saved a new phone.
 */
export function useSharePhone(before: string | undefined, onReceived?: (fresh: User) => void) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [waiting, setWaiting] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const webApp = getTelegramWebApp()
  const canShare = Boolean(webApp?.requestContact && webApp.isVersionAtLeast('6.9'))

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const share = () => {
    webApp?.requestContact?.((shared) => {
      if (!shared) return
      setWaiting(true)
      let tries = 0
      const poll = async () => {
        tries += 1
        try {
          const fresh = await getMe()
          if (fresh.phone && fresh.phone !== before) {
            queryClient.setQueryData(ME_KEY, fresh)
            setWaiting(false)
            onReceived?.(fresh)
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

  return { canShare, waiting, share }
}
