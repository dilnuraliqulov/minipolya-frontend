import {
  Bell,
  CircleHelp,
  CreditCard,
  Globe,
  Heart,
  Info,
  Phone,
  SunMoon,
  User as UserIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import type { User } from '../api/users'
import { Card, ListRow } from '../components'
import { isLanguage } from '../i18n'
import { useUnreadCount } from '../notifications/queries'
import { useThemePreference } from '../theme'
import { LANGUAGE_LABEL_KEYS, THEME_LABEL_KEYS } from './labels'
import { formatPhone } from './phone'
import { LanguageSheet, ThemeSheet } from './SettingsSheets'

/** The design's small caps section label above a group of rows (HISOB, ILOVA, MAYDON). */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="-mb-2 px-1 pt-1 text-xs font-semibold tracking-caps text-secondary uppercase">
      {children}
    </h2>
  )
}

/** A labelled group of rows. */
export function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4" aria-label={title}>
      <SectionLabel>{title}</SectionLabel>
      <Card>{children}</Card>
    </section>
  )
}

/** HISOB — the same in player and owner mode. */
export function AccountSection({ user }: { user: User }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <ProfileSection title={t('profile.sectionAccount')}>
      <ListRow
        icon={UserIcon}
        label={t('profile.personal')}
        onClick={() => navigate('/profile/personal')}
      />
      <ListRow
        icon={Phone}
        label={t('profile.phone')}
        value={user.phone ? formatPhone(user.phone) : t('profile.phoneNotSet')}
        onClick={() => navigate('/profile/phone')}
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
    </ProfileSection>
  )
}

/** ILOVA — the same in player and owner mode. Til and Mavzu open their sheets. */
export function AppSection({ user }: { user: User }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const theme = useThemePreference()
  const unread = useUnreadCount()
  const [sheet, setSheet] = useState<'language' | 'theme' | null>(null)
  const language = isLanguage(user.language) ? user.language : 'uz'
  const count = unread.data?.count ?? 0
  return (
    <>
      <ProfileSection title={t('profile.sectionApp')}>
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
        <ListRow
          icon={Bell}
          label={t('notifications.title')}
          value={count > 0 ? t('notifications.unreadValue', { count }) : undefined}
          onClick={() => navigate('/profile/notifications')}
        />
        <ListRow
          icon={CircleHelp}
          label={t('help.title')}
          onClick={() => navigate('/profile/help')}
        />
        <ListRow icon={Info} label={t('about.title')} onClick={() => navigate('/profile/about')} />
      </ProfileSection>
      <LanguageSheet
        open={sheet === 'language'}
        current={language}
        onClose={() => setSheet(null)}
      />
      <ThemeSheet open={sheet === 'theme'} onClose={() => setSheet(null)} />
    </>
  )
}

/** "MiniPolya v1.0.0 · Telegram ilovasi" at the bottom of both profiles. */
export function AppVersion({ owner = false }: { owner?: boolean }) {
  const { t } = useTranslation()
  return (
    <p className="pt-2 text-center text-xs text-secondary">
      {t(owner ? 'profile.versionOwner' : 'profile.version', { version: __APP_VERSION__ })}
    </p>
  )
}
