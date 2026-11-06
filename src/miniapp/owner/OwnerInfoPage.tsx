import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { LatLon } from '../../shared/map'
import { errorMessage } from '../api/errors'
import {
  OWNER_STADIUMS_KEY,
  ownerStadiumKey,
  updateStadium,
  type OwnerStadiumDetail,
} from '../api/owner'
import { BottomBar, Button, Input, Screen, useToast } from '../components'
import { LocationPicker } from '../components/LocationPicker'
import { useGoBack } from '../lib/useGoBack'
import { formatPhoneInput, toWirePhone } from '../profile/phone'
import { OwnerDetailPage } from './OwnerDetailPage'
import { DistrictField, FormatField, PhoneField, SurfaceField } from './StadiumFields'
import {
  checkAddress,
  checkDistrict,
  checkLandmark,
  checkLocation,
  checkName,
  checkPhone,
  STADIUM_LIMITS,
  type RuleKey,
} from './stadiumRules'

/** Maʼlumotlar: name, format, surface, phone, the map pin, district, address, Moʻljal. */
export function OwnerInfoPage() {
  const { t } = useTranslation()
  return (
    <OwnerDetailPage
      title={t('owner.section.info')}
      screen={(stadium, header) => <InfoForm key={stadium.id} stadium={stadium} header={header} />}
    />
  )
}

type Field = 'name' | 'phone' | 'point' | 'district' | 'address' | 'landmark'

function InfoForm({ stadium, header }: { stadium: OwnerStadiumDetail; header: ReactNode }) {
  const { t } = useTranslation()
  const toast = useToast()
  const goBack = useGoBack('/owner/stadium')
  const queryClient = useQueryClient()
  const [name, setName] = useState(stadium.name)
  const [format, setFormat] = useState(stadium.format ?? '7x7')
  const [surface, setSurface] = useState(stadium.surfaceType ?? 'artificial')
  const [phone, setPhone] = useState(formatPhoneInput(stadium.phone ?? ''))
  const [point, setPoint] = useState<LatLon | null>(
    stadium.latitude !== undefined && stadium.longitude !== undefined
      ? { lat: stadium.latitude, lon: stadium.longitude }
      : null,
  )
  const [district, setDistrict] = useState(stadium.district ?? '')
  const [address, setAddress] = useState(stadium.address ?? '')
  const [landmark, setLandmark] = useState(stadium.landmark ?? '')
  const [tried, setTried] = useState(false)

  // An older stadium may have no phone, district or pin yet: those stay optional until set.
  const rules: Partial<Record<Field, RuleKey | null>> = {
    name: checkName(name),
    phone: checkPhone(phone, stadium.phone !== undefined),
    point: point || stadium.latitude !== undefined ? checkLocation(point) : null,
    district: district || stadium.district ? checkDistrict(district) : null,
    address: checkAddress(address),
    landmark: checkLandmark(landmark),
  }
  const invalid = Object.values(rules).some(Boolean)
  const error = (field: Field) => {
    const key = tried ? rules[field] : null
    return key ? t(key) : undefined
  }

  const save = useMutation({
    mutationFn: () => {
      const wirePhone = toWirePhone(phone)
      return updateStadium(stadium.id, {
        name: name.trim(),
        address: address.trim(),
        format,
        surfaceType: surface,
        ...(district ? { district } : {}),
        ...(wirePhone.length > 4 ? { phone: wirePhone } : {}),
        // Blank clears the landmark.
        landmark: landmark.trim(),
        ...(point
          ? { latitude: Number(point.lat.toFixed(6)), longitude: Number(point.lon.toFixed(6)) }
          : {}),
      })
    },
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
            loading={save.isPending}
            onClick={() => {
              setTried(true)
              if (!invalid) save.mutate()
            }}
          >
            {t('owner.save')}
          </Button>
        </BottomBar>
      }
    >
      <Input
        label={t('owner.field.name')}
        value={name}
        maxLength={STADIUM_LIMITS.nameMax}
        error={error('name')}
        onChange={(e) => setName(e.target.value)}
      />
      <FormatField value={format} onChange={setFormat} />
      <SurfaceField value={surface} onChange={setSurface} />
      <PhoneField value={phone} onChange={setPhone} error={error('phone')} />
      <LocationPicker value={point} onChange={setPoint} error={error('point')} />
      <DistrictField value={district} onChange={setDistrict} error={error('district')} />
      <Input
        label={t('owner.field.address')}
        value={address}
        maxLength={STADIUM_LIMITS.addressMax}
        error={error('address')}
        onChange={(e) => setAddress(e.target.value)}
      />
      <Input
        label={t('owner.field.landmark')}
        placeholder={t('owner.field.landmarkPlaceholder')}
        value={landmark}
        maxLength={STADIUM_LIMITS.landmarkMax}
        error={error('landmark')}
        onChange={(e) => setLandmark(e.target.value)}
      />
    </Screen>
  )
}
