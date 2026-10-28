import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// Page tests load the dynamically imported sample adapter on first use, which
// can take over a second on a busy machine; the default 1 s wait is too tight.
configure({ asyncUtilTimeout: 3000 })

afterEach(() => {
  cleanup()
})
