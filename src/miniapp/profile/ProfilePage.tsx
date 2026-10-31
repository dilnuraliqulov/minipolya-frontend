import { CreditCard, Globe, Heart, LandPlot, SunMoon, User as UserIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import type { User } from '../api/users'
import { useSession } from '../auth/sessionContext'
import { Card, ErrorState, ListRow, SkeletonList, Switch } from '../components'
import { isLanguage } from '../i18n'
import { TabScreen } from '../layout/TabScreen'
import { useThemePreference } from '../theme'
import { LANGUAGE_LABEL_KEYS, THEME_LABEL_KEYS } from './labels'
import { formatPhone } from './phone'
import { initials } from './profile'
import { useMe, useOwnerStadiums } from './queries'
import { LanguageSheet, ThemeSheet } from './SettingsSheets'

/** The Profil tab: who you are, your settings, and owner mode when you have a stadium. */
export function ProfilePage() {
  const { t } = useTranslation()
  const session = useSession()
  const me = useMe()

  useEffect(() => {
    // The backend authorises by the token's role flags; re-login if they moved.
    if (me.data) session.checkRoles(me.data)
  }, [me.data, session])

  return (
    <TabScreen title={t('tabs.profile')}>
      {me.isPending ? (
        <SkeletonList />
      ) : me.isError ? (
        <ErrorState onRetry={() => void me.refetch()} />
      ) : (
        <ProfileContent user={me.data} />
      )}
    </TabScreen>
  )
}

function ProfileContent({ user }: { user: User }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const theme = useThemePreference()
  const [sheet, setSheet] = useState<'language' | 'theme' | null>(null)
  const language = isLanguage(user.language) ? user.language : 'uz'

  return (
    <>
      <div className="flex items-center gap-4 pt-3 pb-2">
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent text-3xl font-bold text-on-accent"
          aria-hidden
        >
          {initials(user.name)}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-2xl font-bold text-primary">{user.name}</p>
          <p className="text-base text-secondary">
            {user.phone ? formatPhone(user.phone) : t('profile.noPhone')}
          </p>
        </div>
      </div>

      {user.isOwner && <OwnerModeRow />}

      <Card>
        <ListRow
          icon={UserIcon}
          label={t('profile.personal')}
          onClick={() => navigate('/profile/personal')}
        />
        <ListRow
          icon={CreditCard}
          label={t('profile.cards')}
          onClick={() => navigate('/profile/cards')}
        />
        <ListRow
          icon={Heart}
          label={t('profile.favorites')}
          onClick={() => navigate('/profile/favorites')}
        />
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
    </>
  )
}

/** Shown only when the API says this owner has at least one stadium. */
function OwnerModeRow() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const stadiums = useOwnerStadiums(true)
  if (!stadiums.data || stadiums.data.length === 0) return null
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bar text-link">
        <LandPlot size={20} aria-hidden />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-md font-semibold text-primary">{t('profile.ownerMode')}</p>
        <p className="text-sm text-secondary">{t('profile.ownerModeText')}</p>
      </div>
      <Switch
        label={t('profile.ownerMode')}
        checked={false}
        onChange={(on) => on && navigate('/owner')}
      />
    </Card>
  )
}
