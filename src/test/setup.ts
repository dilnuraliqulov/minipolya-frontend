import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// Page tests render whole pages through the router, waiting on several
// requests; on a busy machine the default 1 s wait is too tight.
configure({ asyncUtilTimeout: 3000 })

afterEach(() => {
  cleanup()
})
