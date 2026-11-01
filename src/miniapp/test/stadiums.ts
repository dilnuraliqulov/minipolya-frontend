import type { Review, Stadium, StadiumDetail, TimeSlot } from '../api/stadiums'
import type { Page } from '../../shared/api'

export function makeStadium(overrides: Partial<Stadium> = {}): Stadium {
  return {
    id: '018f3a2c-0000-7000-8000-0000000000a1',
    name: 'Bunyodkor Arena',
    address: 'Bunyodkor koʻchasi 12',
    district: 'Chilonzor',
    format: '7x7',
    surfaceType: 'artificial',
    status: 'approved',
    pricePerHour: 15_500_000,
    isActive: true,
    averageRating: 4.8,
    reviewCount: 128,
    coverPhotoUrl: 'https://img.test/cover.jpg',
    isFavorited: false,
    ...overrides,
  }
}

export function makeDetail(overrides: Partial<StadiumDetail> = {}): StadiumDetail {
  const base: Partial<Stadium> = makeStadium()
  delete base.coverPhotoUrl
  return {
    ...(base as Stadium),
    ownerId: '018f3a2c-0000-7000-8000-0000000000b1',
    latitude: 41.28,
    longitude: 69.2,
    openTime: '09:00:00',
    closeTime: '23:00:00',
    cancellationPolicy: { cancellationHours: 24 },
    photos: [
      { id: 'p1', url: 'https://img.test/1.jpg', position: 0 },
      { id: 'p2', url: 'https://img.test/2.jpg', position: 1 },
    ],
    amenities: {
      parking: true,
      lighting: true,
      showers: false,
      lockerRoom: true,
      wifi: false,
      cafe: false,
      equipmentRental: false,
      tribune: false,
    },
    isFavorited: false,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...overrides,
  }
}

export function makeSlot(start: string, overrides: Partial<TimeSlot> = {}): TimeSlot {
  const hour = Number(start.slice(0, 2))
  const end = `${String(hour + 1).padStart(2, '0')}:00:00`
  return {
    startTime: `${start}:00`,
    endTime: end,
    available: true,
    status: 'free',
    pricePerHour: 15_500_000,
    hasWaitingGame: false,
    ...overrides,
  }
}

export function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: 'r1',
    stadiumId: '018f3a2c-0000-7000-8000-0000000000a1',
    userId: 'u2',
    userName: 'Jasur A.',
    rating: 5,
    comment: 'Gazon zoʻr',
    createdAt: '2026-10-12T10:00:00Z',
    ...overrides,
  }
}

export function page<T>(
  content: T[],
  { page = 0, totalPages = 1, totalElements = content.length } = {},
): Page<T> {
  return { content, page, size: 20, totalElements, totalPages }
}
