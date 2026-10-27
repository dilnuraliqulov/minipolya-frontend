import { describe, expect, it } from 'vitest'
import { findLeaks, secretsFrom } from './check-dist.mjs'

const initData =
  'auth_date=1793000000&query_id=AAF12345&user=%7B%22id%22%3A12345%7D&hash=0123456789abcdef0123456789abcdef'

describe('check-dist', () => {
  it('collects VITE_DEV_* values and the hash inside them', () => {
    expect(
      secretsFrom({ VITE_DEV_INIT_DATA: initData, VITE_API_URL: 'x', VITE_DEV_EMPTY: ' ' }),
    ).toEqual([initData, '0123456789abcdef0123456789abcdef'])
  })

  it('passes a clean build', () => {
    expect(
      findLeaks([{ name: 'a.js', text: 'console.log("MiniPolya")' }], secretsFrom({})),
    ).toEqual([])
  })

  it('finds the dev login code, initData, and dev values', () => {
    const secrets = secretsFrom({ VITE_DEV_INIT_DATA: initData })
    expect(findLeaks([{ name: 'a.js', text: 'label:"Dev login"' }], secrets)).toEqual([
      'a.js: contains "Dev login"',
    ])
    expect(
      findLeaks([{ name: 'b.js', text: 'x=import.meta.env.VITE_DEV_INIT_DATA' }], secrets),
    ).toEqual(['b.js: contains "VITE_DEV_INIT_DATA"'])
    expect(findLeaks([{ name: 'c.js', text: `const d="${initData}"` }], secrets)).toEqual([
      'c.js: contains Telegram initData',
      'c.js: contains a VITE_DEV_* value',
      'c.js: contains a VITE_DEV_* value',
    ])
    // Even if the string got re-encoded, the bare hash gives it away.
    expect(
      findLeaks([{ name: 'd.js', text: 'h="0123456789abcdef0123456789abcdef"' }], secrets),
    ).toEqual(['d.js: contains a VITE_DEV_* value'])
  })
})
