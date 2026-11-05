import { SearchCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { errorMessageKey } from '../api/errors'
import { ButtonLink, StateView } from '../components'

/**
 * After a money request with no clear answer: tell the player to check
 * Oʻyinlarim instead of offering a retry that could charge again.
 */
export function UnclearOutcome({ error }: { error: unknown }) {
  const { t } = useTranslation()
  const key = errorMessageKey(error)
  const text =
    key === 'errors.paymentConfirming' ||
    key === 'errors.paymentUnclear' ||
    key === 'errors.paymentPending'
      ? t(key)
      : t('game.unclearText')
  return (
    <StateView icon={SearchCheck} title={t('game.unclearTitle')} description={text}>
      <div className="w-full pt-3">
        <ButtonLink to="/games" replace>
          {t('game.toGames')}
        </ButtonLink>
      </div>
    </StateView>
  )
}
