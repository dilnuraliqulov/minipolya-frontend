import { ChevronLeft, ChevronRight, ImagePlus, RotateCw, Star, X } from 'lucide-react'
import { useCallback, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { asJpegFile, downscaleImage, ImageError } from '../lib/downscaleImage'
import { haptic } from '../telegram'
import { Badge } from './Badge'
import { cx } from './cx'
import { LogoMark } from './LogoMark'

export const MAX_PHOTOS = 10

/** One tile: a local file not uploaded yet, or a photo the server has. */
export interface PickerPhoto {
  key: string
  /** A local file; its thumbnail is an object URL made (and revoked) by the tile. */
  file?: Blob
  /** A server photo's absolute URL. */
  url?: string
  /** `uploading` shows `progress`; `failed` offers a retry. Absent: just the photo. */
  state?: 'queued' | 'uploading' | 'failed'
  /** 0–1. */
  progress?: number
  /** Whether it can be moved or made the cover (a photo still uploading cannot). */
  movable?: boolean
}

interface PhotoPickerProps {
  photos: PickerPhoto[]
  /** Downscaled JPEG files, in the order picked. */
  onAdd: (files: File[]) => void
  onRemove: (key: string) => void
  /** `from` / `to` are indexes in `photos`. */
  onMove: (from: number, to: number) => void
  onRetry?: (key: string) => void
  /** Everything waits (a reorder or delete is saving). */
  busy?: boolean
  /** A rule broken outside the picker, e.g. "at least 3". */
  error?: string
  max?: number
}

/**
 * A local file shown at once: an object URL made when the `<img>` mounts and
 * revoked when it goes (a React 19 ref cleanup, so StrictMode cannot leave a
 * revoked URL on screen).
 */
function BlobImage({ blob, alt, className }: { blob: Blob; alt: string; className?: string }) {
  const attach = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img || typeof URL.createObjectURL !== 'function') return
      const url = URL.createObjectURL(blob)
      img.src = url
      return () => URL.revokeObjectURL(url)
    },
    [blob],
  )
  return <img ref={attach} alt={alt} className={className} />
}

/** A small 4:3 thumbnail of a local photo (wizard review and upload list). */
export function LocalThumb({
  file,
  alt,
  cover = false,
  className,
}: {
  file: Blob
  alt: string
  cover?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <span
      className={cx('relative block aspect-4/3 overflow-hidden rounded-lg bg-surface', className)}
    >
      <BlobImage blob={file} alt={alt} className="size-full object-cover" />
      {cover && (
        <span className="absolute bottom-1 left-1">
          <Badge tone="accent">{t('owner.photos.cover')}</Badge>
        </span>
      )}
    </span>
  )
}

/**
 * The stadium photo grid (design "Maydon qoʻshish / 3 Rasmlar"), shared by the
 * add-stadium wizard (local files) and Maydonim → Rasmlar (server photos):
 * 2 columns of 4:3 tiles, the first is the cover; move left / right, "Muqova
 * qilish", delete; an add tile; per-photo upload progress and retry. Picked
 * files are checked and downscaled on the device before `onAdd`.
 */
export function PhotoPicker({
  photos,
  onAdd,
  onRemove,
  onMove,
  onRetry,
  busy = false,
  error,
  max = MAX_PHOTOS,
}: PhotoPickerProps) {
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  const hintId = useId()
  const [preparing, setPreparing] = useState(0)
  const [problem, setProblem] = useState<string | null>(null)
  const room = max - photos.length - preparing

  const pick = async (list: FileList | null) => {
    const files = Array.from(list ?? [])
    if (input.current) input.current.value = ''
    if (files.length === 0) return
    const problems = new Set<string>()
    if (files.length > room) problems.add(t('owner.photos.tooMany'))
    const taken = files.slice(0, Math.max(0, room))
    setPreparing((n) => n + taken.length)
    const ready: File[] = []
    for (const file of taken) {
      try {
        ready.push(asJpegFile(await downscaleImage(file), file.name))
      } catch (cause) {
        const code = cause instanceof ImageError ? cause.code : 'notImage'
        problems.add(t(code === 'tooLarge' ? 'owner.photos.tooLarge' : 'owner.photos.notImage'))
      } finally {
        setPreparing((n) => n - 1)
      }
    }
    setProblem(problems.size > 0 ? [...problems].join(' · ') : null)
    if (ready.length > 0) onAdd(ready)
  }

  const shownError = problem ?? error
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-secondary">{t('owner.photos.text')}</p>
        <span className="shrink-0 text-sm font-semibold text-primary tabular-nums">
          {t('owner.photos.counter', { count: photos.length, max })}
        </span>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        data-testid="photo-input"
        onChange={(e) => void pick(e.target.files)}
      />
      <ul className="grid grid-cols-2 gap-3" aria-label={t('owner.section.photos')}>
        {photos.map((photo, index) => (
          <PhotoTile
            key={photo.key}
            photo={photo}
            index={index}
            busy={busy}
            canMoveLeft={
              index > 0 && photo.movable !== false && photos[index - 1]?.movable !== false
            }
            canMoveRight={
              index < photos.length - 1 &&
              photo.movable !== false &&
              photos[index + 1]?.movable !== false
            }
            onRemove={() => onRemove(photo.key)}
            onMove={(to) => onMove(index, to)}
            onRetry={onRetry && (() => onRetry(photo.key))}
          />
        ))}
        {Array.from({ length: preparing }, (_, i) => (
          <li
            key={`preparing-${i}`}
            className="flex aspect-4/3 animate-pulse items-center justify-center rounded-xl bg-skeleton text-xs text-secondary"
          >
            {t('owner.photos.preparing')}
          </li>
        ))}
        {room > 0 && (
          <li>
            <button
              type="button"
              disabled={busy}
              aria-describedby={hintId}
              onClick={() => {
                haptic.light()
                input.current?.click()
              }}
              className="flex aspect-4/3 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-accent bg-accent-soft text-sm font-semibold text-link disabled:opacity-50"
            >
              <ImagePlus size={24} aria-hidden />
              {t('owner.photos.add')}
            </button>
          </li>
        )}
      </ul>
      <p id={hintId} className="text-xs text-secondary">
        {t('owner.photos.hint')}
      </p>
      {shownError && (
        <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">
          {shownError}
        </p>
      )}
    </div>
  )
}

function PhotoTile({
  photo,
  index,
  busy,
  canMoveLeft,
  canMoveRight,
  onRemove,
  onMove,
  onRetry,
}: {
  photo: PickerPhoto
  index: number
  busy: boolean
  canMoveLeft: boolean
  canMoveRight: boolean
  onRemove: () => void
  onMove: (to: number) => void
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  const [broken, setBroken] = useState(false)
  const n = index + 1
  const alt = t('owner.photos.alt', { n })
  const inFlight = photo.state === 'queued' || photo.state === 'uploading'
  const iconButton =
    'flex size-11 items-center justify-center text-on-accent disabled:opacity-30 [&>span]:flex [&>span]:size-8 [&>span]:items-center [&>span]:justify-center [&>span]:rounded-full [&>span]:bg-image-overlay'

  return (
    <li className="relative aspect-4/3 overflow-hidden rounded-xl bg-surface">
      {photo.file ? (
        <BlobImage blob={photo.file} alt={alt} className="size-full object-cover" />
      ) : photo.url && !broken ? (
        <img
          src={photo.url}
          alt={alt}
          className="size-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <span
          role="img"
          aria-label={alt}
          className="flex size-full items-center justify-center text-secondary"
        >
          <LogoMark size={28} className="opacity-40" />
        </span>
      )}
      {index === 0 && (
        <span className="absolute top-2 left-2">
          <Badge tone="accent">{t('owner.photos.cover')}</Badge>
        </span>
      )}
      {!inFlight && (
        <button
          type="button"
          aria-label={t('owner.photos.delete', { n })}
          disabled={busy}
          onClick={onRemove}
          className={cx(iconButton, 'absolute top-0 right-0')}
        >
          <span>
            <X size={16} aria-hidden />
          </span>
        </button>
      )}
      {photo.state === 'failed' ? (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-danger px-2 py-1 text-xs font-semibold text-on-accent">
          <span className="truncate">{t('owner.photos.failed')}</span>
          {onRetry && (
            <button
              type="button"
              aria-label={t('owner.photos.retry', { n })}
              onClick={onRetry}
              className="flex size-11 shrink-0 items-center justify-center"
            >
              <RotateCw size={18} aria-hidden />
            </button>
          )}
        </div>
      ) : inFlight ? (
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-image-overlay px-3 py-2">
          <span className="text-xs font-semibold text-on-accent tabular-nums">
            {t('owner.photos.progress', { percent: Math.round((photo.progress ?? 0) * 100) })}
          </span>
          <span className="h-1 overflow-hidden rounded-full bg-overlay">
            <span
              className="block h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: `${Math.round((photo.progress ?? 0) * 100)}%` }}
            />
          </span>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between">
          <button
            type="button"
            aria-label={t('owner.photos.left', { n })}
            disabled={busy || !canMoveLeft}
            onClick={() => onMove(index - 1)}
            className={cx(iconButton, !canMoveLeft && 'invisible')}
          >
            <span>
              <ChevronLeft size={18} aria-hidden />
            </span>
          </button>
          {index > 0 && canMoveLeft && (
            <button
              type="button"
              aria-label={t('owner.photos.makeCoverN', { n })}
              title={t('owner.photos.makeCover')}
              disabled={busy}
              onClick={() => onMove(0)}
              className={iconButton}
            >
              <span>
                <Star size={16} aria-hidden />
              </span>
            </button>
          )}
          <button
            type="button"
            aria-label={t('owner.photos.right', { n })}
            disabled={busy || !canMoveRight}
            onClick={() => onMove(index + 1)}
            className={cx(iconButton, !canMoveRight && 'invisible')}
          >
            <span>
              <ChevronRight size={18} aria-hidden />
            </span>
          </button>
        </div>
      )}
    </li>
  )
}
