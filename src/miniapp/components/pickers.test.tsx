import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LatLon } from '../../shared/map'
import '../i18n'
import { installFakeTelegram, removeFakeTelegram } from '../test/fakeTelegram'
import type { TelegramLocationManager } from '../telegram/webApp'
import { LocationPicker } from './LocationPicker'
import { PhotoPicker, type PickerPhoto } from './PhotoPicker'

vi.mock('./LocationMap', () => ({
  default: ({ point, focus }: { point: LatLon | null; focus: number }) => (
    <div
      data-testid="map"
      data-focus={focus}
      data-point={point ? `${point.lat},${point.lon}` : ''}
    />
  ),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  removeFakeTelegram()
})

const jpeg = (name: string) => new File(['x'], name, { type: 'image/jpeg' })

describe('PhotoPicker', () => {
  const photos: PickerPhoto[] = [
    { key: 'a', file: jpeg('a.jpg') },
    { key: 'b', file: jpeg('b.jpg') },
    { key: 'c', file: jpeg('c.jpg'), state: 'failed' },
  ]

  it('marks the cover, moves, makes a cover, deletes and retries', () => {
    const onMove = vi.fn()
    const onRemove = vi.fn()
    const onRetry = vi.fn()
    render(
      <PhotoPicker
        photos={photos}
        onAdd={vi.fn()}
        onMove={onMove}
        onRemove={onRemove}
        onRetry={onRetry}
      />,
    )
    expect(screen.getByText('Muqova')).toBeInTheDocument()
    expect(screen.getByText('3/10')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '1-rasmni oʻngga surish' }))
    expect(onMove).toHaveBeenLastCalledWith(0, 1)
    fireEvent.click(screen.getByRole('button', { name: '2-rasmni chapga surish' }))
    expect(onMove).toHaveBeenLastCalledWith(1, 0)
    fireEvent.click(screen.getByRole('button', { name: '2-rasmni muqova qilish' }))
    expect(onMove).toHaveBeenLastCalledWith(1, 0)
    expect(screen.queryByRole('button', { name: '1-rasmni muqova qilish' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '2-rasmni oʻchirish' }))
    expect(onRemove).toHaveBeenCalledWith('b')
    expect(screen.getByText('Yuklanmadi')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '3-rasmni qayta yuklash' }))
    expect(onRetry).toHaveBeenCalledWith('c')
  })

  it('downscales picked images and adds only as many as fit', async () => {
    const onAdd = vi.fn()
    render(
      <PhotoPicker
        photos={photos.slice(0, 2)}
        max={3}
        onAdd={onAdd}
        onMove={vi.fn()}
        onRemove={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByTestId('photo-input'), {
      target: { files: [jpeg('x.jpg'), jpeg('y.jpg')] },
    })
    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1))
    expect(onAdd.mock.calls[0]?.[0]).toHaveLength(1)
    expect(screen.getByRole('alert')).toHaveTextContent('Koʻpi bilan 10 ta rasm')
  })

  it('shows progress while a photo uploads, with no delete or move', () => {
    render(
      <PhotoPicker
        photos={[{ key: 'u', file: jpeg('u.jpg'), state: 'uploading', progress: 0.64 }]}
        onAdd={vi.fn()}
        onMove={vi.fn()}
        onRemove={vi.fn()}
      />,
    )
    expect(screen.getByText('64%')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /oʻchirish/ })).toBeNull()
  })
})

function Harness({ initial = null }: { initial?: LatLon | null }) {
  const [point, setPoint] = useState<LatLon | null>(initial)
  return <LocationPicker value={point} onChange={setPoint} />
}

function telegramLocation(data: { latitude: number; longitude: number } | null) {
  const manager = {
    isInited: true,
    isLocationAvailable: true,
    isAccessRequested: true,
    isAccessGranted: data !== null,
    init: vi.fn(),
    getLocation: vi.fn((callback: (d: typeof data) => void) => callback(data)),
    openSettings: vi.fn(),
  } as unknown as TelegramLocationManager
  installFakeTelegram({ version: '8.0', LocationManager: manager })
}

describe('LocationPicker', () => {
  it('starts with no point, then "Joriy joylashuvim" moves the pin and flies the map there', async () => {
    telegramLocation({ latitude: 41.311, longitude: 69.279 })
    render(<Harness />)
    expect(screen.getByText('Joy belgilanmagan — xaritaga bosing')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Joriy joylashuvim' }))
    expect(await screen.findByText('41.31100, 69.27900')).toBeInTheDocument()
    const map = await screen.findByTestId('map')
    expect(map).toHaveAttribute('data-focus', '1')
    expect(map).toHaveAttribute('data-point', '41.311,69.279')
  })

  it('says so when location access is refused', async () => {
    telegramLocation(null)
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Joriy joylashuvim' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Joylashuvga ruxsat berilmadi. Telegram sozlamalarida ruxsat bering yoki xaritada belgilang.',
    )
  })

  it('reads a Yandex link (longitude first) and refuses a broken one', async () => {
    render(<Harness initial={{ lat: 41.2995, lon: 69.2401 }} />)
    const link = screen.getByLabelText('Xarita havolasi')
    fireEvent.change(link, { target: { value: 'https://yandex.uz/maps/?pt=69.28,41.31&z=17' } })
    expect(screen.getByText('41.31000, 69.28000')).toBeInTheDocument()
    fireEvent.change(link, { target: { value: 'salom' } })
    expect(
      screen.getByText('Havoladan joyni topib boʻlmadi. Xaritada belgilang.'),
    ).toBeInTheDocument()
    expect(screen.getByText('41.31000, 69.28000')).toBeInTheDocument()
  })
})
