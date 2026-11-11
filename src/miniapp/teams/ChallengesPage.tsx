import { useTranslation } from 'react-i18next'
import { Header, Screen, SkeletonList } from '../components'
import { useGoBack } from '../lib/useGoBack'
import { ChallengeBoard } from './ChallengeBoard'
import { useLedTeams } from './queries'

/**
 * The full challenge board outside Jamoam (design E11, the home carousel's
 * "Hammasi"). A captain accepts for the team they lead (the first, if several).
 */
export function ChallengesPage() {
  const { t } = useTranslation()
  const goBack = useGoBack('/')
  const led = useLedTeams()
  return (
    <Screen header={<Header title={t('home.challengesTitle')} onBack={goBack} />}>
      {led.isPending ? (
        <SkeletonList count={3} variant="item" />
      ) : (
        <ChallengeBoard acceptAs={led.teams[0]?.id} showTitle={false} />
      )}
    </Screen>
  )
}
