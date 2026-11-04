import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ImagePlus, Star, X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../../shared/api'
import { errorMessage } from '../api/errors'
import {
  deleteStadiumPhoto,
  OWNER_STADIUMS_KEY,
  ownerStadiumKey,
  reorderStadiumPhotos,
  uploadStadiumPhoto,
  type OwnerStadiumDetail,
  type StadiumPhoto,
} from '../api/owner'
import { Badge, BottomBar, Button, EmptyState, LogoMark, Screen, useToast } from '../components'
import { OwnerDetailPage } from './OwnerDetailPage'

/** The backend's limits (R36), checked here only to say so before uploading. */
const MAX_PHOTOS = 10
const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp'

/** Maydonim → Rasmlar: up to 10 photos; the first is the cover. */
export function OwnerPhotosPage() {
  const { t } = useTranslation()
  return (
    <OwnerDetailPage
      title={t('owner.section.photos')}
      screen={(stadium, header) => <Photos stadium={stadium} header={header} />}
    />
  )
}

function Photos({ stadium, header }: { stadium: OwnerStadiumDetail; header: ReactNode }) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const photos = [...(stadium.photos ?? [])].sort((a, b) => a.position - b.position)
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ownerStadiumKey(stadium.id) })
    void queryClient.invalidateQueries({ queryKey: OWNER_STADIUMS_KEY })
  }
  const onError = (error: unknown) => toast.show(errorMessage(error), 'danger')

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) await uploadStadiumPhoto(stadium.id, file)
    },
    onSuccess: () => toast.show(t('owner.photos.uploaded'), 'success'),
    onError,
    onSettled: refresh,
  })
  const remove = useMutation({
    mutationFn: (photo: StadiumPhoto) => deleteStadiumPhoto(stadium.id, photo.id),
    onSuccess: () => toast.show(t('owner.photos.deleted'), 'success'),
    onError,
    onSettled: refresh,
  })
  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderStadiumPhotos(stadium.id, ids),
    onError,
    onSettled: refresh,
  })
  const busy = upload.isPending || remove.isPending || reorder.isPending

  const move = (from: number, to: number) => {
    const ids = photos.map((p) => p.id)
    const [id] = ids.splice(from, 1)
    if (id === undefined) return
    ids.splice(to, 0, id)
    reorder.mutate(ids)
  }

  const pick = (list: FileList | null) => {
    const files = Array.from(list ?? [])
    if (input.current) input.current.value = ''
    if (files.length === 0) return
    if (files.some((file) => file.size > MAX_BYTES)) {
      toast.show(t('errors.fileTooLarge'), 'danger')
      return
    }
    if (photos.length + files.length > MAX_PHOTOS) {
      toast.show(t('errors.tooManyPhotos'), 'danger')
      return
    }
    upload.mutate(files)
  }

  return (
    <Screen
      header={header}
      footer={
        <BottomBar>
          <Button
            haptic
            icon={ImagePlus}
            loading={upload.isPending}
            disabled={busy || photos.length >= MAX_PHOTOS}
            onClick={() => input.current?.click()}
          >
            {t('owner.photos.upload')}
          </Button>
        </BottomBar>
      }
    >
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        data-testid="photo-input"
        onChange={(e) => pick(e.target.files)}
      />
      <p className="text-sm text-secondary">{t('owner.photos.text')}</p>
      {photos.length === 0 ? (
        <EmptyState
          title={t('owner.photos.emptyTitle')}
          description={t('owner.photos.emptyText')}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3" aria-label={t('owner.section.photos')}>
          {photos.map((photo, index) => (
            <li key={photo.id} className="flex flex-col gap-2">
              <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-surface">
                <PhotoImage url={photo.url} alt={t('owner.photos.alt', { n: index + 1 })} />
                {index === 0 && (
                  <span className="absolute top-2 left-2">
                    <Badge tone="accent">{t('owner.photos.cover')}</Badge>
                  </span>
                )}
                <button
                  type="button"
                  aria-label={t('owner.photos.delete', { n: index + 1 })}
                  disabled={busy}
                  onClick={() => remove.mutate(photo)}
                  className="absolute top-0 right-0 flex size-11 items-center justify-center"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-image-overlay text-on-accent">
                    <X size={16} aria-hidden />
                  </span>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-label={t('owner.photos.left', { n: index + 1 })}
                  disabled={busy || index === 0}
                  onClick={() => move(index, index - 1)}
                  className="flex size-11 items-center justify-center rounded-xl text-link disabled:opacity-30"
                >
                  <ChevronLeft size={20} aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={t('owner.photos.right', { n: index + 1 })}
                  disabled={busy || index === photos.length - 1}
                  onClick={() => move(index, index + 1)}
                  className="flex size-11 items-center justify-center rounded-xl text-link disabled:opacity-30"
                >
                  <ChevronRight size={20} aria-hidden />
                </button>
              </div>
              {index > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => move(index, 0)}
                  className="flex min-h-11 items-center justify-center gap-1 rounded-xl text-sm font-medium text-link disabled:opacity-40"
                >
                  <Star size={14} aria-hidden />
                  {t('owner.photos.makeCover')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-secondary">
        {t('owner.photos.limits', { count: photos.length, max: MAX_PHOTOS })}
      </p>
    </Screen>
  )
}

/** The photo, or the logo mark when its file does not load. */
function PhotoImage({ url, alt }: { url: string; alt: string }) {
  const [broken, setBroken] = useState(false)
  if (broken) {
    return (
      <span
        role="img"
        aria-label={alt}
        className="flex size-full items-center justify-center text-secondary"
      >
        <LogoMark size={28} className="opacity-40" />
      </span>
    )
  }
  return (
    <img
      src={mediaUrl(url)}
      alt={alt}
      className="size-full object-cover"
      onError={() => setBroken(true)}
    />
  )
}
