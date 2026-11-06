/** The backend's upload limit (D5): 5 MB per photo. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
/** The long side the backend keeps; sending more only costs the owner's mobile data. */
export const MAX_SIDE = 2000
export const JPEG_QUALITY = 0.85

export type ImageErrorCode = 'notImage' | 'tooLarge'

/** Why a picked file cannot be uploaded: `notImage` ("Bu fayl rasm emas"), `tooLarge` (over 5 MB). */
export class ImageError extends Error {
  readonly code: ImageErrorCode
  constructor(code: ImageErrorCode) {
    super(code)
    this.name = 'ImageError'
    this.code = code
  }
}

async function encode(bitmap: ImageBitmap, width: number, height: number): Promise<Blob> {
  const options = { type: 'image/jpeg', quality: JPEG_QUALITY }
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    draw(canvas.getContext('2d'), bitmap, width, height)
    return canvas.convertToBlob(options)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d'), bitmap, width, height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImageError('notImage'))),
      options.type,
      options.quality,
    ),
  )
}

function draw(
  context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null,
  bitmap: ImageBitmap,
  width: number,
  height: number,
) {
  if (!context) throw new ImageError('notImage')
  // JPEG has no transparency: a transparent PNG would turn black without a white backdrop.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)
}

/**
 * A picked photo made ready for upload on the device: decoded with its EXIF
 * rotation applied, shrunk to at most 2000 px on the long side and written as
 * JPEG (quality 0.85) — far less mobile data than a 12 MP camera original.
 * The server re-encodes it anyway (D5), so this is about size, not trust.
 *
 * Throws `ImageError('notImage')` for a file that is not an image or cannot be
 * decoded, `ImageError('tooLarge')` when the result is still over 5 MB. A
 * browser without `createImageBitmap` sends the original when it is small enough.
 */
export async function downscaleImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new ImageError('notImage')
  if (typeof createImageBitmap !== 'function') {
    if (file.size > MAX_UPLOAD_BYTES) throw new ImageError('tooLarge')
    return file
  }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new ImageError('notImage')
  }
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const blob = await encode(bitmap, width, height)
    if (blob.size > MAX_UPLOAD_BYTES) throw new ImageError('tooLarge')
    return blob
  } finally {
    bitmap.close()
  }
}

/** A downscaled photo as a named JPEG file for the multipart upload. */
export function asJpegFile(blob: Blob, name: string): File {
  if (blob instanceof File) return blob
  const base = name.replace(/\.[^.]*$/, '') || 'photo'
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
}
