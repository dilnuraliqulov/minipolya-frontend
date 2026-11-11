import { Building2, FileCheck, Lock, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Card, ErrorState, Header, Screen, SkeletonList } from '../components'
import { useGoBack } from '../lib/useGoBack'
import { openSupport, supportUsername } from '../telegram'
import { CONTRACT_STATUS_KEYS, LEGAL_TYPE_KEYS } from './contract'
import { useOwnerLegal } from './queries'

/**
 * Owner Profil → Toʻlovlar va shartnoma (GET /api/owner/legal-details, R39):
 * read-only. Changes go through the platform's support.
 */
export function OwnerContractPage() {
  const { t } = useTranslation()
  const goBack = useGoBack('/owner/profile')
  const legal = useOwnerLegal()
  const support = supportUsername()
  return (
    <Screen header={<Header title={t('owner.contract.title')} onBack={goBack} />}>
      {legal.isPending ? (
        <SkeletonList count={3} />
      ) : legal.isError ? (
        <ErrorState onRetry={() => void legal.refetch()} />
      ) : (
        <>
          <p className="flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2.5 text-sm font-medium text-primary">
            <Lock size={18} className="shrink-0 text-link" aria-hidden />
            {t('owner.contract.readOnly')}
          </p>
          <Card>
            <Row
              icon={Building2}
              label={t('owner.contract.legalType')}
              value={
                legal.data.legalType && LEGAL_TYPE_KEYS[legal.data.legalType]
                  ? t(LEGAL_TYPE_KEYS[legal.data.legalType]!)
                  : t('owner.contract.notSet')
              }
            />
            <Row
              icon={FileCheck}
              label={t('owner.contract.atmos')}
              value={t(
                CONTRACT_STATUS_KEYS[legal.data.atmosContractStatus] ??
                  'owner.contract.status.none',
              )}
            />
          </Card>
          <p className="text-sm text-secondary">{t('owner.contract.payoutNote')}</p>
          {support && (
            <Button variant="ghost" onClick={openSupport}>
              <Send size={18} aria-hidden />
              {t('owner.contract.support')}
            </Button>
          )}
        </>
      )}
    </Screen>
  )
}

function Row({ icon: Icon, label, value }: { icon: typeof Lock; label: string; value: string }) {
  return (
    <div className="flex min-h-13 items-center gap-3 border-b border-border px-4 py-2 last:border-b-0">
      <Icon size={22} className="shrink-0 text-link" aria-hidden />
      <span className="flex-1 text-md font-medium text-primary">{label}</span>
      <span className="text-base text-secondary">{value}</span>
    </div>
  )
}
