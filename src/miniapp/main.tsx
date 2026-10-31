import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { configureApiClient, createMemoryTokenStore, createQueryClient } from '../shared/api'
import { App } from './App'
import { AuthGate } from './auth/AuthGate'
import { SessionProvider } from './auth/SessionProvider'
import { createSession } from './auth/session'
import './i18n'
import './index.css'
import { initViewport } from './telegram'
import { initMiniAppTheme } from './theme'

// ready() + expand() + safe-area CSS variables.
initViewport()
initMiniAppTheme()

const queryClient = createQueryClient()

// The JWT lives in memory only: every launch logs in again from Telegram initData.
const tokenStore = createMemoryTokenStore()
const session = createSession({ tokenStore, queryClient })
configureApiClient({
  tokenStore,
  onUnauthorized: session.handleUnauthorized,
  onAccountBlocked: session.handleAccountBlocked,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>
        <AuthGate>
          <App />
        </AuthGate>
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
)
