import { ArrowLeftRight, ChevronsUpDown, FileText, LandPlot, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import type { OwnerStadium } from '../api/owner'
import type { User } from '../api/users'
import { BottomSheet, Card, ErrorState, ListRow, OptionList, SkeletonList } from '../components'
import { formatPhone } from '../profile/phone'
import { AccountSection, AppSection, AppVersion, ProfileSection } from '../profile/ProfileSections'
import { useMe } from '../profile/queries'
import { CONTRACT_STATUS_KEYS } from './contract'
import { OwnerTabScreen } from './OwnerTabScreen'
import { useOwnerLegal, useOwnerStadiumList } from './queries'

/**
 * Owner mode's Profil: the current stadium (with a switcher when there are
 * several), back to player mode, MAYDON, and the same HISOB / ILOVA as the
 * player's Profil.
 */
export function OwnerProfilePage() {
  const { t } = useTranslation()
  const me = useMe()
  const stadiums = useOwnerStadiumList()
  const title = t('owner.tabs.profile')

  if (me.isPending || stadiums.isPending) {
    return (
      <OwnerTabScreen title={title}>
        <SkeletonList />
      </OwnerTabScreen>
    )
  }
  if (me.isError || stadiums.isError) {
    return (
      <OwnerTabScreen title={title}>
        <ErrorState
          onRetry={() => {
            if (me.isError) void me.refetch()
            if (stadiums.isError) void stadiums.refetch()
          }}
        />
      </OwnerTabScreen>
    )
  }
  return (
    <OwnerTabScreen title={title}>
      <OwnerProfileContent user={me.data} stadiums={stadiums.data} />
    </OwnerTabScreen>
  )
}

function OwnerProfileContent({ user, stadiums }: { user: User; stadiums: OwnerStadium[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const [picking, setPicking] = useState(false)
  const legal = useOwnerLegal()
  const current = stadiums.find((s) => s.id === search.get('stadium')) ?? stadiums[0]
  const contract = legal.data?.atmosContractStatus

  return (
    <>
      <div className="flex items-center gap-4 pt-3 pb-2">
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-accent text-on-accent"
          aria-hidden
        >
          <LandPlot size={30} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-2xl font-bold text-primary">
            {current?.name ?? t('owner.noStadiumTitle')}
          </p>
          <p className="truncate text-base text-secondary">
            {[user.name, user.phone && formatPhone(user.phone)].filter(Boolean).join(' · ')}
          </p>
        </div>
        {stadiums.length > 1 && (
          <button
            type="button"
            aria-label={t('owner.profile.switchStadium')}
            onClick={() => setPicking(true)}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-background text-link"
          >
            <ChevronsUpDown size={20} aria-hidden />
          </button>
        )}
      </div>

      <Card>
        <ListRow
          icon={ArrowLeftRight}
          label={t('owner.profile.playerMode')}
          onClick={() => navigate('/profile')}
        />
      </Card>

      <ProfileSection title={t('owner.profile.sectionStadium')}>
        <ListRow
          icon={LandPlot}
          label={t('owner.profile.myStadiums')}
          value={t('owner.profile.count', { count: stadiums.length })}
          onClick={() => navigate('/owner/stadium')}
        />
        <ListRow
          icon={Plus}
          label={t('owner.wizard.title')}
          onClick={() => navigate('/owner/new')}
        />
        <ListRow
          icon={FileText}
          label={t('owner.contract.title')}
          value={
            contract ? t(CONTRACT_STATUS_KEYS[contract] ?? 'owner.contract.status.none') : undefined
          }
          onClick={() => navigate('/owner/contract')}
        />
      </ProfileSection>

      <AccountSection user={user} />
      <AppSection user={user} />
      <AppVersion owner />

      <BottomSheet
        open={picking}
        title={t('owner.profile.switchStadium')}
        onClose={() => setPicking(false)}
      >
        {current && (
          <OptionList
            label={t('owner.profile.switchStadium')}
            options={stadiums.map((s) => ({ value: s.id, label: s.name }))}
            value={current.id}
            onChange={(id) => {
              const next = new URLSearchParams(search)
              next.set('stadium', id)
              setSearch(next, { replace: true })
              setPicking(false)
            }}
          />
        )}
      </BottomSheet>
    </>
  )
}
