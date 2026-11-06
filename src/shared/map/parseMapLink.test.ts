import { describe, expect, it } from 'vitest'
import { parseMapLink } from './parseMapLink'

const at = (lat: number, lon: number) => ({ lat, lon })

describe('parseMapLink', () => {
  it.each([
    ['https://www.google.com/maps/@41.2995,69.2401,15z', at(41.2995, 69.2401)],
    ['https://www.google.com/maps?q=41.31,69.28', at(41.31, 69.28)],
    ['https://maps.google.com/?q=41.31%2C69.28', at(41.31, 69.28)],
    ['https://www.google.com/maps/search/?api=1&query=41.3,69.2', at(41.3, 69.2)],
    ['https://www.google.com/maps?ll=41.25,69.19&z=16', at(41.25, 69.19)],
    ['google.com/maps/@-33.8688,151.2093,12z', at(-33.8688, 151.2093)],
  ])('reads Google %s', (link, expected) => {
    expect(parseMapLink(link)).toEqual(expected)
  })

  it('prefers the place pin (!3d…!4d…) over the view centre (@…)', () => {
    const link =
      'https://www.google.com/maps/place/Bunyodkor/@41.29,69.20,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d41.2995!4d69.2401'
    expect(parseMapLink(link)).toEqual(at(41.2995, 69.2401))
  })

  it.each([
    ['https://yandex.uz/maps/?ll=69.2401,41.2995&z=12', at(41.2995, 69.2401)],
    ['https://yandex.ru/maps/10335/tashkent/?pt=69.28,41.31&z=17&l=map', at(41.31, 69.28)],
    ['https://yandex.uz/maps/?whatshere[point]=69.21,41.33&z=17', at(41.33, 69.21)],
    [
      'https://yandex.uz/maps/?whatshere%5Bpoint%5D=69.21%2C41.33&whatshere%5Bzoom%5D=17',
      at(41.33, 69.21),
    ],
  ])('reads Yandex %s (longitude first)', (link, expected) => {
    expect(parseMapLink(link)).toEqual(expected)
  })

  it('prefers the Yandex pin (pt) over the view centre (ll)', () => {
    expect(parseMapLink('https://yandex.uz/maps/?ll=69.0,41.0&pt=69.28,41.31')).toEqual(
      at(41.31, 69.28),
    )
  })

  it('finds the link inside shared text', () => {
    expect(parseMapLink('Bunyodkor stadioni\nhttps://www.google.com/maps/@41.2,69.2,15z')).toEqual(
      at(41.2, 69.2),
    )
  })

  it('reads plain coordinates', () => {
    expect(parseMapLink('41.29950, 69.24010')).toEqual(at(41.2995, 69.2401))
  })

  it.each([
    'https://maps.app.goo.gl/AbCdEf123',
    'https://goo.gl/maps/AbCdEf123',
    'https://yandex.uz/maps/-/CDqZaB~1',
    'https://yandex.ru/maps/-/CDqZaB~1',
  ])('reports a short link: %s', (link) => {
    expect(parseMapLink(link)).toBe('short')
  })

  it.each([
    '',
    'salom',
    'https://example.com/?q=41.3,69.2x',
    'https://www.google.com/maps/place/Tashkent',
    'https://www.google.com/maps/@95.1,69.2,15z',
    'https://yandex.uz/maps/?pt=200,41',
  ])('rejects %j', (link) => {
    expect(parseMapLink(link)).toBeNull()
  })
})
