import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Photo } from '../api/stadiums'
import { cx } from '../components'

/** The design's Gallery: swipeable photos (240px), a "1/5" counter and dots. */
export function Gallery({ photos, name }: { photos: Photo[]; name: string }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const sorted = [...photos].sort((a, b) => a.position - b.position)
  if (sorted.length === 0) return null

  return (
    <div className="relative h-60 shrink-0 bg-surface">
      <div
        className="flex size-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
        onScroll={(event) => {
          const el = event.currentTarget
          setIndex(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)))
        }}
      >
        {sorted.map((photo, i) => (
          <img
            key={photo.id}
            src={photo.url}
            alt={t('stadium.photoAlt', { name, n: i + 1 })}
            className="size-full shrink-0 snap-center object-cover"
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}
      </div>
      {sorted.length > 1 && (
        <>
          <span className="absolute top-4 right-4 flex h-6.5 items-center rounded-xl bg-image-overlay px-3 text-xs font-semibold text-on-accent">
            {index + 1}/{sorted.length}
          </span>
          <span
            className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2"
            aria-hidden
          >
            {sorted.map((photo, i) => (
              <span
                key={photo.id}
                className={cx(
                  'rounded-full bg-on-accent',
                  i === index ? 'size-2' : 'size-1.5 opacity-50',
                )}
              />
            ))}
          </span>
        </>
      )}
    </div>
  )
}
