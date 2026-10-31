import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { configureApiClient, createMemoryTokenStore, createQueryClient } from '../shared/api'
import '../shared/theme/index.css'
import { App } from './App'
import './i18n'
import { initViewport } from './telegram'
import { initMiniAppTheme } from './theme'

// ready() + expand() + safe-area CSS variables.
initViewport()
initMiniAppTheme()

// The token lives in memory: every launch logs in again from Telegram initData.
configureApiClient({ tokenStore: createMemoryTokenStore() })

const queryClient = createQueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
