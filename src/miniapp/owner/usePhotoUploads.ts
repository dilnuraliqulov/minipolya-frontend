import { useCallback, useEffect, useReducer, useRef } from 'react'
import { uploadStadiumPhoto, type StadiumPhoto } from '../api/owner'
import { errorMessage } from '../api/errors'

export interface UploadItem {
  key: string
  file: Blob
  state: 'queued' | 'uploading' | 'done' | 'failed'
  /** 0–1. */
  progress: number
  /** The translated reason, when failed. */
  error?: string
  /** The server's photo, once uploaded. */
  photo?: StadiumPhoto
}

type Action =
  | { type: 'add'; items: Array<{ key: string; file: Blob }> }
  | { type: 'start'; key: string }
  | { type: 'progress'; key: string; progress: number }
  | { type: 'done'; key: string; photo: StadiumPhoto }
  | { type: 'failed'; key: string; error: string }
  | { type: 'retry'; key: string }
  | { type: 'remove'; key: string }

function reducer(items: UploadItem[], action: Action): UploadItem[] {
  const update = (key: string, change: Partial<UploadItem>) =>
    items.map((item) => (item.key === key ? { ...item, ...change } : item))
  switch (action.type) {
    case 'add':
      return [
        ...items,
        ...action.items.map((item) => ({ ...item, state: 'queued' as const, progress: 0 })),
      ]
    case 'start':
      return update(action.key, { state: 'uploading', progress: 0, error: undefined })
    case 'progress':
      return update(action.key, { progress: action.progress })
    case 'done':
      return update(action.key, { state: 'done', progress: 1, photo: action.photo })
    case 'failed':
      return update(action.key, { state: 'failed', error: action.error })
    case 'retry':
      return update(action.key, { state: 'queued', progress: 0, error: undefined })
    case 'remove':
      return items.filter((item) => item.key !== action.key)
  }
}

let nextKey = 0
/** A key for a picked file that stays the same while it waits, uploads and is retried. */
export const newUploadKey = () => `upload-${++nextKey}`

/**
 * Uploads photos to a stadium one at a time (design D17), each with its
 * progress (`XMLHttpRequest` upload events). A failed photo stays `failed`
 * until `retry`; the others carry on. Nothing starts while `stadiumId` is null
 * (the wizard creates the stadium first). `onUploaded` runs after each photo;
 * a returned promise is awaited before the next one starts.
 */
export function usePhotoUploads(
  stadiumId: string | null,
  onUploaded?: (photo: StadiumPhoto, key: string) => void | Promise<void>,
) {
  const [items, dispatch] = useReducer(reducer, [])
  const callback = useRef(onUploaded)
  // Each attempt starts once, even when an effect runs twice (StrictMode).
  const started = useRef(new Set<string>())
  useEffect(() => {
    callback.current = onUploaded
  })

  const uploading = items.some((item) => item.state === 'uploading')
  const next = items.find((item) => item.state === 'queued')

  useEffect(() => {
    if (!stadiumId || uploading || !next) return
    const { key, file } = next
    if (started.current.has(key)) return
    started.current.add(key)
    dispatch({ type: 'start', key })
    uploadStadiumPhoto(stadiumId, file, (progress) => dispatch({ type: 'progress', key, progress }))
      .then(async (photo) => {
        try {
          await callback.current?.(photo, key)
        } catch {
          // The photo is uploaded either way; never offer to upload it twice.
        }
        dispatch({ type: 'done', key, photo })
      })
      .catch((error: unknown) => {
        started.current.delete(key)
        dispatch({ type: 'failed', key, error: errorMessage(error) })
      })
  }, [stadiumId, uploading, next])

  const add = useCallback(
    (files: Array<{ key: string; file: Blob }>) => dispatch({ type: 'add', items: files }),
    [],
  )
  const retry = useCallback((key: string) => dispatch({ type: 'retry', key }), [])
  const remove = useCallback((key: string) => dispatch({ type: 'remove', key }), [])

  return { items, add, retry, remove }
}
