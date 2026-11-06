import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '../api/errors'
import {
  OWNER_STADIUMS_KEY,
  ownerStadiumKey,
  updateStadium,
  type OwnerStadiumDetail,
} from '../api/owner'
import { BottomBar, Button, Screen, useToast } from '../components'
import { useGoBack } from '../lib/useGoBack'
import { OwnerDetailPage } from './OwnerDetailPage'
import { HourStepper } from './StadiumFields'
import { checkHours, hourLabel, hourToTime, timeToHour } from './stadiumRules'

/** Maydonim → Ish vaqti: opening and closing hour, whole hours (D14, D15). */
export function OwnerHoursPage() {
  const { t } = useTranslation()
  return (
    <OwnerDetailPage
      title={t('owner.section.hours')}
      screen={(stadium, header) => <HoursForm key={stadium.id} stadium={stadium} header={header} />}
    />
  )
}

function HoursForm({ stadium, header }: { stadium: OwnerStadiumDetail; header: ReactNode }) {
  const { t } = useTranslation()
  const toast = useToast()
  const goBack = useGoBack('/owner/stadium')
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(timeToHour(stadium.openTime))
  const [close, setClose] = useState(timeToHour(stadium.closeTime))
  const rule = checkHours(open, close)
  const save = useMutation({
    mutationFn: () =>
      updateStadium(stadium.id, { openTime: hourToTime(open), closeTime: hourToTime(close) }),
    onSuccess: () => {
      toast.show(t('owner.hours.saved'), 'success')
      void queryClient.invalidateQueries({ queryKey: ownerStadiumKey(stadium.id) })
      void queryClient.invalidateQueries({ queryKey: OWNER_STADIUMS_KEY })
      goBack()
    },
    onError: (e) => toast.show(errorMessage(e), 'danger'),
  })
  return (
    <Screen
      header={header}
      footer={
        <BottomBar>
          <Button
            haptic
            disabled={rule !== null}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            {t('owner.save')}
          </Button>
        </BottomBar>
      }
    >
      <div className="flex gap-3">
        <HourStepper label={t('owner.wizard.open')} value={open} max={22} onChange={setOpen} />
        <HourStepper label={t('owner.wizard.close')} value={close} min={1} onChange={setClose} />
      </div>
      {rule ? (
        <p role="alert" className="text-sm text-danger">
          {t(rule)}
        </p>
      ) : (
        <p className="text-sm font-medium text-primary">
          {t('owner.wizard.everyDayHours', {
            open: hourLabel(open),
            close: hourLabel(close),
            count: close - open,
          })}
        </p>
      )}
      <p className="text-xs text-secondary">{t('owner.wizard.hoursNote')}</p>
      <p className="text-sm text-secondary">{t('owner.hours.note')}</p>
    </Screen>
  )
}
