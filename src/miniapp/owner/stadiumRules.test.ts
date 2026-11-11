import { describe, expect, it } from 'vitest'
import uz from '../i18n/locales/uz.json'
import {
  checkAddress,
  checkDescription,
  checkDistrict,
  checkHours,
  checkLandmark,
  checkLocation,
  checkName,
  checkPhone,
  checkPhotoCount,
  checkPrice,
  hourLabel,
  hourToTime,
  timeToHour,
} from './stadiumRules'

describe('stadium rules (the backend’s, D1 and D10–D15)', () => {
  it('name: 3–150 characters, trimmed', () => {
    expect(checkName('  ab ')).toBe('owner.rules.nameLength')
    expect(checkName('Arena')).toBeNull()
    expect(checkName('x'.repeat(151))).toBe('owner.rules.nameLength')
  })

  it('address: 5–300 characters', () => {
    expect(checkAddress('Navo')).toBe('owner.rules.addressLength')
    expect(checkAddress('Navoiy 5')).toBeNull()
    expect(checkAddress('x'.repeat(301))).toBe('owner.rules.addressLength')
  })

  it('district: one of the twelve', () => {
    expect(checkDistrict('')).toBe('owner.rules.districtRequired')
    expect(checkDistrict('Chilonzor')).toBeNull()
    expect(checkDistrict('Mirzo Ulugʻbek')).toBeNull()
    expect(checkDistrict('Samarqand')).toBe('owner.rules.districtRequired')
  })

  it('phone: +998 and nine digits; optional when editing an old stadium', () => {
    expect(checkPhone('+998 90 123 45')).toBe('owner.rules.phoneFormat')
    expect(checkPhone('+998 90 123 45 67')).toBeNull()
    expect(checkPhone('+998 ')).toBe('owner.rules.phoneFormat')
    expect(checkPhone('+998 ', false)).toBeNull()
    expect(checkPhone('+998 90', false)).toBe('owner.rules.phoneFormat')
  })

  it('location: required, inside Uzbekistan', () => {
    expect(checkLocation(null)).toBe('owner.rules.locationRequired')
    expect(checkLocation({ lat: 41.3, lon: 69.24 })).toBeNull()
    expect(checkLocation({ lat: 55.75, lon: 37.62 })).toBe('owner.rules.outsideUzbekistan')
  })

  it('price: 10 000 – 5 000 000 soʻm', () => {
    expect(checkPrice(0)).toBe('owner.rules.priceRange')
    expect(checkPrice(9_999)).toBe('owner.rules.priceRange')
    expect(checkPrice(10_000)).toBeNull()
    expect(checkPrice(5_000_000)).toBeNull()
    expect(checkPrice(5_000_001)).toBe('owner.rules.priceRange')
  })

  it('hours: whole hours, closing after opening, not after midnight', () => {
    expect(checkHours(8, 23)).toBeNull()
    expect(checkHours(8, 8)).toBe('owner.rules.hoursOrder')
    expect(checkHours(22, 2)).toBe('owner.rules.hoursOrder')
  })

  it('description ≤ 500, landmark ≤ 150, at least 3 photos', () => {
    expect(checkDescription('x'.repeat(500))).toBeNull()
    expect(checkDescription('x'.repeat(501))).toBe('owner.rules.descriptionLength')
    expect(checkLandmark('x'.repeat(150))).toBeNull()
    expect(checkLandmark('x'.repeat(151))).toBe('owner.rules.landmarkLength')
    expect(checkPhotoCount(2)).toBe('owner.rules.photosMin')
    expect(checkPhotoCount(3)).toBeNull()
  })

  it('every message is translated', () => {
    const rules = uz.owner.rules as Record<string, string>
    for (const key of [
      'nameLength',
      'addressLength',
      'districtRequired',
      'phoneFormat',
      'locationRequired',
      'outsideUzbekistan',
      'priceRange',
      'hoursOrder',
      'descriptionLength',
      'landmarkLength',
      'photosMin',
    ]) {
      expect(rules[key]).toBeTruthy()
    }
  })

  it('converts whole hours to and from the API’s times', () => {
    expect(hourToTime(8)).toBe('08:00:00')
    expect(timeToHour('23:00:00')).toBe(23)
    expect(hourLabel(0)).toBe('00:00')
  })
})
