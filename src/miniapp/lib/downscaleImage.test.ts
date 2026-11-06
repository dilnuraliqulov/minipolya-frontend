import { afterEach, describe, expect, it, vi } from 'vitest'
import { downscaleImage, ImageError, MAX_UPLOAD_BYTES } from './downscaleImage'

const file = (type: string, size = 10) => new File([new Uint8Array(size)], 'photo', { type })

function stubCanvas(outputSize = 1000) {
  const draws: Array<[number, number]> = []
  const sizes: Array<[number, number]> = []
  const convert = vi.fn(async (options: { type: string; quality: number }) => {
    return new Blob([new Uint8Array(outputSize)], { type: options.type })
  })
  class FakeOffscreenCanvas {
    constructor(width: number, height: number) {
      sizes.push([width, height])
    }
    getContext() {
      return {
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage: (_: unknown, __: number, ___: number, w: number, h: number) =>
          draws.push([w, h]),
      }
    }
    convertToBlob = convert
  }
  vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas)
  return { draws, sizes, convert }
}

function stubBitmap(width: number, height: number) {
  const close = vi.fn()
  const create = vi.fn(async () => ({ width, height, close }))
  vi.stubGlobal('createImageBitmap', create)
  return { create, close }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('downscaleImage', () => {
  it('refuses a file that is not an image', async () => {
    await expect(downscaleImage(file('application/pdf'))).rejects.toEqual(
      new ImageError('notImage'),
    )
  })

  it('refuses an image the device cannot decode', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        throw new Error('decode')
      }),
    )
    await expect(downscaleImage(file('image/heic'))).rejects.toMatchObject({ code: 'notImage' })
  })

  it('shrinks the long side to 2000 px, applies EXIF rotation and writes JPEG 0.85', async () => {
    const { create, close } = stubBitmap(4000, 3000)
    const { sizes, draws, convert } = stubCanvas()
    const blob = await downscaleImage(file('image/png'))
    expect(create).toHaveBeenCalledWith(expect.any(File), { imageOrientation: 'from-image' })
    expect(sizes).toEqual([[2000, 1500]])
    expect(draws).toEqual([[2000, 1500]])
    expect(convert).toHaveBeenCalledWith({ type: 'image/jpeg', quality: 0.85 })
    expect(blob.type).toBe('image/jpeg')
    expect(close).toHaveBeenCalled()
  })

  it('keeps a small image at its size (portrait too)', async () => {
    stubBitmap(900, 1600)
    const { sizes } = stubCanvas()
    await downscaleImage(file('image/jpeg'))
    expect(sizes).toEqual([[900, 1600]])
  })

  it('refuses a result over 5 MB', async () => {
    stubBitmap(2000, 2000)
    stubCanvas(MAX_UPLOAD_BYTES + 1)
    await expect(downscaleImage(file('image/jpeg'))).rejects.toMatchObject({ code: 'tooLarge' })
  })

  it('without createImageBitmap, sends the file as it is when it is small enough', async () => {
    vi.stubGlobal('createImageBitmap', undefined)
    const small = file('image/jpeg', 100)
    await expect(downscaleImage(small)).resolves.toBe(small)
    await expect(downscaleImage(file('image/jpeg', MAX_UPLOAD_BYTES + 1))).rejects.toMatchObject({
      code: 'tooLarge',
    })
  })
})
