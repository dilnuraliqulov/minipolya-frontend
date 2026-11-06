import { describe, expect, it } from 'vitest'
import { googleMapsLink, isInUzbekistan, mapLink, yandexMapsLink } from './mapLink'

describe('mapLink — "Xaritada ochish"', () => {
  it('points OpenStreetMap at the coordinates when the stadium has them', () => {
    expect(mapLink({ latitude: 41.28, longitude: 69.2, address: 'x' })).toBe(
      'https://www.openstreetmap.org/?mlat=41.28&mlon=69.2#map=17/41.28/69.2',
    )
  })

  it('searches the address otherwise', () => {
    expect(mapLink({ address: 'Bunyodkor koʻchasi 12' })).toBe(
      'https://www.openstreetmap.org/search?query=Bunyodkor%20ko%CA%BBchasi%2012',
    )
  })
})

describe('Yandex and Google links', () => {
  it('puts a Yandex pin, longitude first', () => {
    expect(yandexMapsLink(41.2995, 69.2401)).toBe(
      'https://yandex.uz/maps/?pt=69.2401,41.2995&z=17&l=map',
    )
  })

  it('searches the point on Google', () => {
    expect(googleMapsLink(41.2995, 69.2401)).toBe(
      'https://www.google.com/maps/search/?api=1&query=41.2995,69.2401',
    )
  })
})

describe('isInUzbekistan', () => {
  it.each([
    [41.2995, 69.2401, true],
    [37.1, 55.9, true],
    [45.6, 73.2, true],
    [37.09, 69.2, false],
    [41.3, 73.21, false],
    [55.75, 37.62, false],
  ])('%f, %f → %s', (lat, lon, inside) => {
    expect(isInUzbekistan(lat, lon)).toBe(inside)
  })
})
