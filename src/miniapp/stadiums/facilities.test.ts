import { describe, expect, it } from 'vitest'
import uz from '../i18n/locales/uz.json'
import { ALL_FACILITIES, FACILITIES, NO_AMENITIES, presentFacilities } from './facilities'

describe('facilities', () => {
  it('offers the ten facilities of the design, each once', () => {
    expect(FACILITIES.map((f) => f.key)).toEqual([
      'parking',
      'lockerRoom',
      'showers',
      'toilet',
      'lighting',
      'covered',
      'equipmentRental',
      'bibs',
      'drinkingWater',
      'tribune',
    ])
  })

  it('knows every amenity of the API, each with a translated name', () => {
    expect(ALL_FACILITIES.map((f) => f.key).sort()).toEqual(Object.keys(NO_AMENITIES).sort())
    for (const { key } of ALL_FACILITIES) {
      expect(uz.stadium.amenity[key]).toBeTruthy()
    }
  })

  it('lists what a stadium has, wifi and cafe last', () => {
    const keys = presentFacilities({ ...NO_AMENITIES, wifi: true, toilet: true, parking: true })
    expect(keys.map((f) => f.key)).toEqual(['parking', 'toilet', 'wifi'])
    expect(presentFacilities(undefined)).toEqual([])
  })
})
