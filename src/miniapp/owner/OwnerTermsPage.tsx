import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Minus, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { somToTiyin } from '../../shared/format'
import { errorMessage } from '../api/errors'
import {
  OWNER_STADIUMS_KEY,
  ownerStadiumKey,
  updateStadium,
  type OwnerStadiumDetail,
} from '../api/owner'
import { BottomBar, Button, Card, Input, Screen, Switch, useToast } from '../components'
import { formatMoney } from '../format'
import { useGoBack } from '../lib/useGoBack'
import { OwnerDetailPage } from './OwnerDetailPage'

/** Up to 999 999 999 soʻm. */
const moneyInput = (value: string) => value.replace(/\D/g, '').slice(0, 9)
const MAX_HOURS = 168

/**
 * Maydonim → Bron shartlari: the minimum the player pays when booking ("Minimum
 * yoʻq" = full payment, R41) with what players pay for it from the API, and the
 * cancellation hours.
 */
export function OwnerTermsPage() {
  const { t } = useTranslation()
  return (
    <OwnerDetailPage
      title={t('owner.section.terms')}
      screen={(stadium, header) => <TermsForm key={stadium.id} stadium={stadium} header={header} />}
    />
  )
}

function TermsForm({ stadium, header }: { stadium: OwnerStadiumDetail; header: ReactNode }) {
  const { t } = useTranslation()
  const toast = useToast()
  const goBack = useGoBack('/owner/stadium')
  const queryClient = useQueryClient()
  const saved = stadium.minBookingAmount
  const [hasMinimum, setHasMinimum] = useState(saved !== undefined)
  const [amount, setAmount] = useState(saved !== undefined ? String(Math.floor(saved / 100)) : '')
  const [hours, setHours] = useState(stadium.cancellationPolicy?.cancellationHours ?? 24)
  const som = Number(amount || '0')
  const save = useMutation({
    mutationFn: () =>
      updateStadium(stadium.id, {
        ...(hasMinimum ? { minBookingAmount: somToTiyin(som) } : { clearMinBookingAmount: true }),
        cancellationHours: hours,
      }),
    onSuccess: () => {
      toast.show(t('owner.saved'), 'success')
      void queryClient.invalidateQueries({ queryKey: ownerStadiumKey(stadium.id) })
      void queryClient.invalidateQueries({ queryKey: OWNER_STADIUMS_KEY })
      goBack()
    },
  })
  return (
    <Screen
      header={header}
      footer={
        <BottomBar>
          <Button
            haptic
            disabled={hasMinimum && som <= 0}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            {t('owner.save')}
          </Button>
        </BottomBar>
      }
    >
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-md font-semibold text-primary">{t('owner.terms.minimum')}</p>
            <p className="text-sm text-secondary">
              {hasMinimum ? t('owner.terms.minimumOn') : t('owner.terms.minimumOff')}
            </p>
          </div>
          <Switch label={t('owner.terms.minimum')} checked={hasMinimum} onChange={setHasMinimum} />
        </div>
        {hasMinimum && (
          <>
            <Input
              label={t('owner.field.minimum')}
              inputMode="numeric"
              value={amount}
              hint={t('owner.field.minimumHint')}
              onChange={(e) => setAmount(moneyInput(e.target.value))}
            />
            {saved !== undefined && stadium.playerMinBookingAmount !== undefined && (
              <p className="text-sm text-primary">
                {t('owner.terms.playerPays', {
                  amount: formatMoney(stadium.playerMinBookingAmount),
                })}
              </p>
            )}
          </>
        )}
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <p className="text-md font-semibold text-primary">{t('owner.terms.cancelTitle')}</p>
        <p className="text-sm text-secondary">{t('owner.terms.cancelText')}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={t('owner.terms.less')}
            disabled={hours <= 0}
            onClick={() => setHours(Math.max(0, hours - 1))}
            className="flex size-11 items-center justify-center rounded-xl bg-surface text-primary disabled:opacity-40"
          >
            <Minus size={20} aria-hidden />
          </button>
          <output
            className="flex-1 text-center text-lg font-semibold text-primary"
            aria-live="polite"
          >
            {t('owner.terms.hours', { count: hours })}
          </output>
          <button
            type="button"
            aria-label={t('owner.terms.more')}
            disabled={hours >= MAX_HOURS}
            onClick={() => setHours(Math.min(MAX_HOURS, hours + 1))}
            className="flex size-11 items-center justify-center rounded-xl bg-surface text-primary disabled:opacity-40"
          >
            <Plus size={20} aria-hidden />
          </button>
        </div>
      </Card>
      {save.isError && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(save.error)}
        </p>
      )}
    </Screen>
  )
}
