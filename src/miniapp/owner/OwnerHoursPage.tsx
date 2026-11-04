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
import { BottomBar, Button, Input, Screen, useToast } from '../components'
import { useGoBack } from '../lib/useGoBack'
import { OwnerDetailPage } from './OwnerDetailPage'

/** `"08:00:00"` → `"08:00"` */
const hhmm = (time: string) => time.slice(0, 5)
/** Bookings start on the hour, so opening hours must too. */
const onTheHour = (time: string) => time.endsWith(':00')

/** Maydonim → Ish vaqti: opening and closing time (PUT /api/owner/stadiums/{id}). */
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
  const [open, setOpen] = useState(hhmm(stadium.openTime))
  const [close, setClose] = useState(hhmm(stadium.closeTime))
  const error =
    open >= close
      ? t('owner.wizard.hoursError')
      : !onTheHour(open) || !onTheHour(close)
        ? t('owner.wizard.onTheHour')
        : undefined
  const save = useMutation({
    mutationFn: () =>
      updateStadium(stadium.id, { openTime: `${open}:00`, closeTime: `${close}:00` }),
    onSuccess: () => {
      toast.show(t('owner.saved'), 'success')
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
            disabled={Boolean(error)}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            {t('owner.save')}
          </Button>
        </BottomBar>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('owner.field.open')}
          type="time"
          step={3600}
          value={open}
          onChange={(e) => setOpen(e.target.value)}
        />
        <Input
          label={t('owner.field.close')}
          type="time"
          step={3600}
          value={close}
          onChange={(e) => setClose(e.target.value)}
          error={error}
        />
      </div>
      <p className="text-sm text-secondary">{t('owner.hours.note')}</p>
    </Screen>
  )
}
