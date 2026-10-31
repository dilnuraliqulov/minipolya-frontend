import { describe, expect, it } from 'vitest'
import { mapLink } from './mapLink'

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
