import { LandPlot } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import type { User } from '../api/users'
import { useSession } from '../auth/sessionContext'
import { Button, Card, ErrorState, SkeletonBlock, SkeletonList } from '../components'
import { TabScreen } from '../layout/TabScreen'
import { formatPhone } from './phone'
import { initials, ownerState } from './profile'
import { AccountSection, AppSection, AppVersion } from './ProfileSections'
import { useMe, useOwnerStadiums } from './queries'

/** The Profil tab: who you are, owner mode (always), HISOB, ILOVA and the version. */
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
        <>
          <ProfileHeader user={me.data} />
          <OwnerModeCard user={me.data} />
          <AccountSection user={me.data} />
          <AppSection user={me.data} />
          <AppVersion />
        </>
      )}
    </TabScreen>
  )
}

function ProfileHeader({ user }: { user: User }) {
  const { t } = useTranslation()
  return (
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
  )
}

/** "Ega rejimi" — always shown, in one of three states (GET /api/owner/stadiums, R42). */
function OwnerModeCard({ user }: { user: User }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const stadiums = useOwnerStadiums(true)

  if (stadiums.isPending) return <SkeletonBlock />
  if (stadiums.isError) {
    return (
      <Card>
        <ErrorState onRetry={() => void stadiums.refetch()} />
      </Card>
    )
  }
  const state = ownerState(user, stadiums.data)
  return (
    <Card className="flex flex-col gap-3 border border-border p-4">
      <p className="flex items-center gap-2 text-md font-semibold text-primary">
        <LandPlot size={20} className="text-link" aria-hidden />
        {state === 'none' ? t('profile.ownerCard.noneTitle') : t('profile.ownerMode')}
      </p>
      {state === 'none' && (
        <>
          <p className="text-sm text-secondary">{t('profile.ownerCard.noneText')}</p>
          <Button haptic onClick={() => navigate('/owner/new')}>
            {t('owner.wizard.title')}
          </Button>
        </>
      )}
      {state === 'review' && (
        <p className="text-sm text-secondary">{t('profile.ownerCard.reviewText')}</p>
      )}
      {state === 'owner' && (
        <>
          <p className="text-sm text-secondary">{t('profile.ownerModeText')}</p>
          <Button haptic onClick={() => navigate('/owner')}>
            {t('profile.ownerCard.enter')}
          </Button>
        </>
      )}
    </Card>
  )
}
