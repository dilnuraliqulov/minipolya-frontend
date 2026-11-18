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
import { WeeklyHoursEditor } from './WeeklyHoursEditor'
import { checkWeeklyHours, fromApi, toApi, type DayHours } from './hours'

/**
 * Maydonim → Ish vaqti: the weekly opening schedule — the same hours every day, or a day
 * at a time. A day may close after midnight (06:00 at the latest), and those hours belong
 * to the day that opened them.
 */
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
  const [days, setDays] = useState<DayHours[]>(() =>
    fromApi(stadium.hours, stadium.openTime, stadium.closeTime),
  )
  const rule = checkWeeklyHours(days)
  const save = useMutation({
    mutationFn: () => updateStadium(stadium.id, { hours: toApi(days) }),
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
      <WeeklyHoursEditor
        days={days}
        onChange={setDays}
        error={rule === null ? undefined : t(rule)}
      />
      <p className="text-xs text-secondary">{t('owner.wizard.hoursNote')}</p>
      <p className="text-sm text-secondary">{t('owner.hours.note')}</p>
    </Screen>
  )
}
