import type { ParseKeys } from 'i18next'
import { Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { EmptyState, Header, Screen } from '../components'
import { TabScreen } from './TabScreen'

function SoonState() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col justify-center">
      <EmptyState icon={Clock} title={t('common.soon')} description={t('soon.text')} />
    </div>
  )
}

/** A tab that a later part builds: "Tez orada" until then. */
export function SoonTab({ titleKey }: { titleKey: ParseKeys }) {
  const { t } = useTranslation()
  return (
    <TabScreen title={t(titleKey)}>
      <SoonState />
    </TabScreen>
  )
}

/** A sub-screen that a later part builds: "Tez orada", with back navigation. */
export function SoonScreen({ titleKey }: { titleKey: ParseKeys }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <Screen header={<Header title={t(titleKey)} onBack={() => navigate(-1)} />}>
      <SoonState />
    </Screen>
  )
}
