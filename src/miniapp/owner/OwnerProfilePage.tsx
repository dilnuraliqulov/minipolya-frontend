import { Globe, SunMoon, User as UserIcon, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { isAvailable } from '../api/missing'
import { OWNER_LEGAL } from '../api/owner'
import { Badge, Card, ErrorState, ListRow, SkeletonList, Switch } from '../components'
import { isLanguage } from '../i18n'
import { LANGUAGE_LABEL_KEYS, THEME_LABEL_KEYS } from '../profile/labels'
import { formatPhone } from '../profile/phone'
import { initials } from '../profile/profile'
import { useMe } from '../profile/queries'
import { LanguageSheet, ThemeSheet } from '../profile/SettingsSheets'
import { useThemePreference } from '../theme'
import { OwnerTabScreen } from './OwnerTabScreen'
import { useOwnerStadiumList } from './queries'

/** Owner mode's Profil: who you are, back to player mode, payouts, settings. */
export function OwnerProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const me = useMe()
  const stadiums = useOwnerStadiumList()
  const theme = useThemePreference()
  const [sheet, setSheet] = useState<'language' | 'theme' | null>(null)

  if (me.isPending) {
    return (
      <OwnerTabScreen title={t('owner.tabs.profile')}>
        <SkeletonList />
      </OwnerTabScreen>
    )
  }
  if (me.isError) {
    return (
      <OwnerTabScreen title={t('owner.tabs.profile')}>
        <ErrorState onRetry={() => void me.refetch()} />
      </OwnerTabScreen>
    )
  }
  const user = me.data
  const language = isLanguage(user.language) ? user.language : 'uz'
  return (
    <OwnerTabScreen title={t('owner.tabs.profile')}>
      <div className="flex items-center gap-4 pt-3 pb-2">
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent text-3xl font-bold text-on-accent"
          aria-hidden
        >
          {initials(user.name)}
        </div>
        <div className="flex min-w-0 flex-col items-start gap-1">
          <p className="truncate text-2xl font-bold text-primary">{user.name}</p>
          <p className="text-base text-secondary">
            {user.phone ? formatPhone(user.phone) : t('profile.noPhone')}
          </p>
          {stadiums.data && (
            <Badge tone="success">
              {t('owner.profile.badge', { count: stadiums.data.length })}
            </Badge>
          )}
        </div>
      </div>

      <Card className="flex items-center gap-4 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bar text-link">
          <UserIcon size={20} aria-hidden />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-md font-semibold text-primary">{t('owner.profile.playerMode')}</p>
          <p className="text-sm text-secondary">{t('owner.profile.playerModeText')}</p>
        </div>
        <Switch
          label={t('owner.profile.playerMode')}
          checked={false}
          onChange={(on) => on && navigate('/profile')}
        />
      </Card>

      <Card className="flex flex-col gap-2 p-4">
        <p className="flex items-center gap-2 text-md font-semibold text-primary">
          <Wallet size={18} className="text-link" aria-hidden />
          {t('owner.profile.payouts')}
        </p>
        {!isAvailable(OWNER_LEGAL) && (
          <p className="text-sm text-secondary">{t('owner.soonDetail')}</p>
        )}
      </Card>

      <Card>
        <ListRow
          icon={Globe}
          label={t('profile.language')}
          value={t(LANGUAGE_LABEL_KEYS[language])}
          onClick={() => setSheet('language')}
        />
        <ListRow
          icon={SunMoon}
          label={t('profile.theme')}
          value={t(THEME_LABEL_KEYS[theme])}
          onClick={() => setSheet('theme')}
        />
      </Card>

      <LanguageSheet
        open={sheet === 'language'}
        current={language}
        onClose={() => setSheet(null)}
      />
      <ThemeSheet open={sheet === 'theme'} onClose={() => setSheet(null)} />
    </OwnerTabScreen>
  )
}
