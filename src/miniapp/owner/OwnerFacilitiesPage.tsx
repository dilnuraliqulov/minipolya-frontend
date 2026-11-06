import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '../api/errors'
import { ownerStadiumKey, updateStadium, type OwnerStadiumDetail } from '../api/owner'
import { BottomBar, Button, Screen, useToast } from '../components'
import { useGoBack } from '../lib/useGoBack'
import { NO_AMENITIES } from '../stadiums/facilities'
import { OwnerDetailPage } from './OwnerDetailPage'
import { DescriptionField, FacilityChips } from './StadiumFields'
import { checkDescription } from './stadiumRules'

/** Maydonim → Qulayliklar: the ten facilities and "Qoʻshimcha maʼlumot". */
export function OwnerFacilitiesPage() {
  const { t } = useTranslation()
  return (
    <OwnerDetailPage
      title={t('owner.section.facilities')}
      screen={(stadium, header) => (
        <FacilitiesForm key={stadium.id} stadium={stadium} header={header} />
      )}
    />
  )
}

function FacilitiesForm({ stadium, header }: { stadium: OwnerStadiumDetail; header: ReactNode }) {
  const { t } = useTranslation()
  const toast = useToast()
  const goBack = useGoBack('/owner/stadium')
  const queryClient = useQueryClient()
  // All twelve flags, so wifi / cafe (not offered any more) go back unchanged (D9).
  const [amenities, setAmenities] = useState({ ...NO_AMENITIES, ...stadium.amenities })
  const [description, setDescription] = useState(stadium.description ?? '')
  const rule = checkDescription(description)
  const save = useMutation({
    mutationFn: () => updateStadium(stadium.id, { amenities, description: description.trim() }),
    onSuccess: () => {
      toast.show(t('owner.facilities.saved'), 'success')
      void queryClient.invalidateQueries({ queryKey: ownerStadiumKey(stadium.id) })
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
      <p className="text-sm text-secondary">{t('owner.wizard.facilitiesText')}</p>
      <FacilityChips value={amenities} onChange={setAmenities} />
      <DescriptionField
        value={description}
        onChange={setDescription}
        error={rule ? t(rule) : undefined}
      />
    </Screen>
  )
}
