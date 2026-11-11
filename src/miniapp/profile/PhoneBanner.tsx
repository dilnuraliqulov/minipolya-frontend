import { Phone, Send } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Button } from '../components'
import { useMe } from './queries'
import { useSharePhone } from './useSharePhone'

/**
 * Top of Bosh sahifa while the profile has no phone: send it through Telegram
 * (the bot saves it) or type it on Telefon raqam.
 */
export function PhoneBanner() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const titleId = useId()
  const me = useMe()
  const { canShare, waiting, share } = useSharePhone(undefined)

  if (!me.data || me.data.phone) return null

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-3"
    >
      <p id={titleId} className="flex items-center gap-2 text-md font-semibold text-primary">
        <Phone size={18} className="shrink-0 text-link" aria-hidden />
        {t('phoneBanner.title')}
      </p>
      <div className="flex gap-2">
        {canShare && (
          <Button haptic size="compact" loading={waiting} icon={Send} onClick={share}>
            {t('phoneBanner.send')}
          </Button>
        )}
        <Button
          variant="secondary"
          size="compact"
          disabled={waiting}
          onClick={() => navigate('/profile/phone')}
        >
          {t('phoneBanner.type')}
        </Button>
      </div>
    </section>
  )
}
