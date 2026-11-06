import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useReducer, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { errorMessage } from '../../api/errors'
import { createStadium, OWNER_STADIUMS_KEY, reorderStadiumPhotos } from '../../api/owner'
import { BottomBar, BottomSheet, Button, Header, Notice, Screen } from '../../components'
import { cx } from '../../components/cx'
import { useGoBack } from '../../lib/useGoBack'
import { toWirePhone } from '../../profile/phone'
import { useMe } from '../../profile/queries'
import { usePhotoUploads } from '../usePhotoUploads'
import {
  draftReducer,
  firstInvalidStep,
  initialDraft,
  isDirty,
  STEPS,
  toCreateBody,
  validateStep,
  type Step,
} from './draft'
import {
  BasicsStep,
  FacilitiesStep,
  HoursStep,
  LocationStep,
  PhotosStep,
  ReviewStep,
  StepHeading,
  type FieldErrors,
} from './Steps'
import { Sent, UploadProgress } from './SubmitScreens'

/**
 * Maydon qoʻshish (design "Maydon qoʻshish / 1 Asosiy … 6 Koʻrib chiqish"):
 * six steps over one draft (D16), then create the stadium once and upload its
 * photos one by one (D17). "Arizangiz qabul qilindi" only when every photo is
 * uploaded; a failed one is retried alone, the stadium is never created twice.
 */
export function AddStadiumPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const me = useMe().data
  // A player without owner rights (R42) comes from Profil and goes back there.
  const isOwner = me?.isOwner ?? false
  const home = isOwner ? '/owner/stadium' : '/profile'
  const goBack = useGoBack(home)

  const [initial] = useState(() => initialDraft(me?.phone))
  const [draft, dispatch] = useReducer(draftReducer, initial)
  const [step, setStep] = useState<Step>('basics')
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [tried, setTried] = useState<Partial<Record<Step, boolean>>>({})
  const [leaving, setLeaving] = useState(false)

  // Submitting: the created stadium's id is kept, so a retry never creates it again.
  const [stadiumId, setStadiumId] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const completion = useRef<string[]>([])
  const photoIds = useRef(new Map<string, string>())
  const uploads = usePhotoUploads(stadiumId, (photo, key) => {
    completion.current.push(key)
    photoIds.current.set(key, photo.id)
  })
  const create = useMutation({
    mutationFn: () => createStadium(toCreateBody(draft)),
    onSuccess: ({ id }) => {
      setStadiumId(id)
      uploads.add(draft.photos.map((p) => ({ key: p.key, file: p.file })))
      void queryClient.invalidateQueries({ queryKey: OWNER_STADIUMS_KEY })
    },
  })

  const allUploaded =
    stadiumId !== null &&
    uploads.items.length > 0 &&
    uploads.items.every((item) => item.state === 'done')

  // Once all are in: if a retry changed the order, put the owner's order (cover first) back.
  useEffect(() => {
    if (!allUploaded || finished || !stadiumId) return
    const wanted = draft.photos.map((p) => p.key)
    const ids = wanted.map((key) => photoIds.current.get(key)).filter((id) => id !== undefined)
    const reordered = completion.current.some((key, i) => key !== wanted[i])
    const done = () => {
      setFinished(true)
      void queryClient.invalidateQueries({ queryKey: OWNER_STADIUMS_KEY })
    }
    if (reordered && ids.length === wanted.length) {
      reorderStadiumPhotos(stadiumId, ids).then(done, done)
    } else {
      done()
    }
  }, [allUploaded, finished, stadiumId, draft.photos, queryClient])

  useEffect(() => {
    window.scrollTo?.({ top: 0 })
  }, [step, stadiumId, finished])

  const index = STEPS.indexOf(step)
  const go = (next: Step) => {
    setDirection(STEPS.indexOf(next) < index ? 'back' : 'forward')
    setStep(next)
  }
  const errorKeys = validateStep(step, draft)
  const errors: FieldErrors = tried[step]
    ? Object.fromEntries(Object.entries(errorKeys).map(([field, key]) => [field, t(key)]))
    : {}

  const next = () => {
    if (Object.keys(errorKeys).length > 0) {
      setTried({ ...tried, [step]: true })
      return
    }
    const following = STEPS[index + 1]
    if (following) go(following)
  }

  const submit = () => {
    const broken = firstInvalidStep(draft)
    if (broken) {
      setTried({ ...tried, [broken]: true })
      go(broken)
      return
    }
    if (!stadiumId && !create.isPending) create.mutate()
  }

  const back = () => {
    if (create.isPending) return
    if (stadiumId) {
      navigate(home, { replace: true })
      return
    }
    if (index > 0) go(STEPS[index - 1] ?? 'basics')
    else if (isDirty(draft, initial)) setLeaving(true)
    else goBack()
  }

  const header = <Header title={t('owner.wizard.title')} onBack={finished ? undefined : back} />

  if (finished) {
    const profilePhone = me?.phone
    return (
      <Screen header={header}>
        <Sent
          phone={profilePhone ?? toWirePhone(draft.phone)}
          fromProfile={profilePhone !== undefined}
          stadiumLink={home}
          stadiumLabel={isOwner ? t('owner.wizard.toStadium') : t('owner.wizard.toProfile')}
          homeLink={isOwner ? '/owner' : '/'}
        />
      </Screen>
    )
  }

  if (stadiumId) {
    return (
      <Screen
        header={header}
        footer={
          <BottomBar>
            <Button variant="secondary" onClick={() => navigate(home, { replace: true })}>
              {t('owner.wizard.finishLater')}
            </Button>
          </BottomBar>
        }
      >
        <UploadProgress items={uploads.items} onRetry={uploads.retry} />
      </Screen>
    )
  }

  const props = { draft, dispatch, errors }
  return (
    <Screen
      header={header}
      footer={
        <BottomBar>
          {step === 'review' ? (
            <Button haptic loading={create.isPending} onClick={submit}>
              {t('owner.wizard.submit')}
            </Button>
          ) : (
            <Button haptic onClick={next}>
              {t('owner.wizard.next')}
            </Button>
          )}
        </BottomBar>
      }
    >
      <StepHeading step={step} />
      <div
        key={step}
        className={cx(
          'flex flex-col gap-4 motion-reduce:animate-none',
          direction === 'forward' ? 'animate-step-forward' : 'animate-step-back',
        )}
      >
        {step === 'basics' && <BasicsStep {...props} />}
        {step === 'location' && <LocationStep {...props} />}
        {step === 'photos' && <PhotosStep {...props} />}
        {step === 'facilities' && <FacilitiesStep {...props} />}
        {step === 'hours' && <HoursStep {...props} />}
        {step === 'review' && <ReviewStep draft={draft} onEdit={go} />}
        {step === 'review' && create.isError && <Notice>{errorMessage(create.error)}</Notice>}
      </div>
      <BottomSheet
        open={leaving}
        title={t('owner.wizard.leaveTitle')}
        subtitle={t('owner.wizard.leaveText')}
        onClose={() => setLeaving(false)}
        actions={
          <>
            <Button variant="danger" onClick={goBack}>
              {t('owner.wizard.leave')}
            </Button>
            <Button variant="secondary" onClick={() => setLeaving(false)}>
              {t('owner.wizard.stay')}
            </Button>
          </>
        }
      />
    </Screen>
  )
}
