import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '../api/errors'
import { OWNER_STADIUMS_KEY, updateStadium, type OwnerStadium } from '../api/owner'
import { DISTRICTS, FORMATS } from '../api/stadiums'
import { BottomBar, Button, Input, useToast } from '../components'
import { useGoBack } from '../lib/useGoBack'
import { formatLabel, SURFACE_KEYS } from '../stadiums/labels'
import { OwnerStadiumSubPage } from './OwnerStadiumSubPage'
import { SelectField } from './SelectField'

/** Maʼlumotlar: the fields the owner's stadium list carries (the rest waits for R35). */
export function OwnerInfoPage() {
  const { t } = useTranslation()
  return (
    <OwnerStadiumSubPage title={t('owner.section.info')}>
      {(stadium) => <InfoForm key={stadium.id} stadium={stadium} />}
    </OwnerStadiumSubPage>
  )
}

function InfoForm({ stadium }: { stadium: OwnerStadium }) {
  const { t } = useTranslation()
  const toast = useToast()
  const goBack = useGoBack('/owner/stadium')
  const queryClient = useQueryClient()
  const [name, setName] = useState(stadium.name)
  const [address, setAddress] = useState(stadium.address ?? '')
  const [district, setDistrict] = useState(stadium.district ?? '')
  const [format, setFormat] = useState(stadium.format ?? '')
  const [surface, setSurface] = useState(stadium.surfaceType ?? '')
  const save = useMutation({
    mutationFn: () =>
      updateStadium(stadium.id, {
        name: name.trim(),
        address: address.trim(),
        ...(district ? { district } : {}),
        ...(format ? { format } : {}),
        ...(surface ? { surfaceType: surface } : {}),
      }),
    onSuccess: () => {
      toast.show(t('owner.saved'), 'success')
      void queryClient.invalidateQueries({ queryKey: OWNER_STADIUMS_KEY })
      goBack()
    },
    onError: (error) => toast.show(errorMessage(error), 'danger'),
  })
  const valid = name.trim().length > 0 && address.trim().length > 0
  return (
    <>
      <Input
        label={t('owner.field.name')}
        value={name}
        maxLength={150}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        label={t('owner.field.address')}
        value={address}
        maxLength={300}
        onChange={(e) => setAddress(e.target.value)}
      />
      <SelectField
        label={t('owner.field.district')}
        value={district}
        onChange={setDistrict}
        placeholder="—"
        options={DISTRICTS.map((d) => ({ value: d, label: d }))}
      />
      <SelectField
        label={t('owner.field.format')}
        value={format}
        onChange={setFormat}
        placeholder="—"
        options={FORMATS.map((f) => ({ value: f, label: formatLabel(f) }))}
      />
      <SelectField
        label={t('owner.field.surface')}
        value={surface}
        onChange={setSurface}
        placeholder="—"
        options={Object.entries(SURFACE_KEYS).map(([value, key]) => ({ value, label: t(key) }))}
      />
      <BottomBar>
        <Button haptic disabled={!valid} loading={save.isPending} onClick={() => save.mutate()}>
          {t('owner.save')}
        </Button>
      </BottomBar>
    </>
  )
}
