import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../../shared/api'
import { errorMessage } from '../api/errors'
import {
  deleteStadiumPhoto,
  OWNER_STADIUMS_KEY,
  ownerStadiumKey,
  reorderStadiumPhotos,
  type OwnerStadiumDetail,
} from '../api/owner'
import { EmptyState, Screen, useToast } from '../components'
import { PhotoPicker, type PickerPhoto } from '../components/PhotoPicker'
import { OwnerDetailPage } from './OwnerDetailPage'
import { checkPhotoCount } from './stadiumRules'
import { newUploadKey, usePhotoUploads } from './usePhotoUploads'

/** Maydonim → Rasmlar: 3–10 photos, the first is the cover (the shared PhotoPicker). */
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
  const photos = [...(stadium.photos ?? [])].sort((a, b) => a.position - b.position)
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ownerStadiumKey(stadium.id) }),
      queryClient.invalidateQueries({ queryKey: OWNER_STADIUMS_KEY }),
    ])
  const onError = (error: unknown) => toast.show(errorMessage(error), 'danger')

  // A photo leaves the queue once the refreshed list shows it.
  const uploads = usePhotoUploads(stadium.id, async () => {
    await refresh()
  })
  const pending = uploads.items.filter((item) => item.state !== 'done')
  const finished = uploads.items.filter((item) => item.state === 'done')
  const idle = !uploads.items.some((item) => item.state === 'queued' || item.state === 'uploading')
  const { remove: dropUpload } = uploads
  useEffect(() => {
    if (!idle || finished.length === 0) return
    toast.show(t('owner.photos.uploaded'), 'success')
    for (const item of finished) dropUpload(item.key)
  }, [idle, finished, dropUpload, toast, t])

  const remove = useMutation({
    mutationFn: (photoId: string) => deleteStadiumPhoto(stadium.id, photoId),
    onSuccess: () => toast.show(t('owner.photos.deleted'), 'success'),
    onError,
    onSettled: refresh,
  })
  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderStadiumPhotos(stadium.id, ids),
    onError,
    onSettled: refresh,
  })

  const tiles: PickerPhoto[] = [
    ...photos.map((photo) => ({ key: photo.id, url: mediaUrl(photo.url) })),
    ...pending.map((item) => ({
      key: item.key,
      file: item.file,
      state: item.state === 'done' ? undefined : item.state,
      progress: item.progress,
      movable: false,
    })),
  ]
  const failed = pending.find((item) => item.state === 'failed')

  const move = (from: number, to: number) => {
    const ids = photos.map((p) => p.id)
    const [id] = ids.splice(from, 1)
    if (id === undefined || to >= photos.length + 1) return
    ids.splice(to, 0, id)
    reorder.mutate(ids)
  }

  return (
    <Screen header={header}>
      {tiles.length === 0 && (
        <EmptyState
          title={t('owner.photos.emptyTitle')}
          description={t('owner.photos.emptyText')}
        />
      )}
      <PhotoPicker
        photos={tiles}
        busy={remove.isPending || reorder.isPending}
        error={
          failed?.error ??
          (tiles.length > 0 && checkPhotoCount(tiles.length)
            ? t('owner.rules.photosMin')
            : undefined)
        }
        onAdd={(files) => uploads.add(files.map((file) => ({ key: newUploadKey(), file })))}
        onRemove={(key) => {
          if (pending.some((item) => item.key === key)) uploads.remove(key)
          else remove.mutate(key)
        }}
        onMove={move}
        onRetry={uploads.retry}
      />
    </Screen>
  )
}
