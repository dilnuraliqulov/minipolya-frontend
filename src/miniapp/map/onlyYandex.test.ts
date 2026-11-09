import { describe, expect, it } from 'vitest'

const sources = import.meta.glob<string>('/src/miniapp/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})

describe('Mini App maps', () => {
  it('reach Leaflet only through YandexMap, as its fallback', () => {
    const importers = Object.entries(sources)
      .filter(([path]) => !/\.test\.tsx?$/.test(path) && !path.endsWith('/map/YandexMap.tsx'))
      .filter(([, source]) =>
        /from\s+'[^']*\/(StadiumMap|LocationMap)'|import\('[^']*\/(StadiumMap|LocationMap)'\)/.test(
          source,
        ),
      )
      .map(([path]) => path)
    expect(importers).toEqual([])
  })
})
