import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { configureApiClient, createLocalStorageTokenStore } from '../shared/api'
import '../shared/theme/index.css'
import './fonts.css'
import { App } from './App'
import { logout, restoreSession, unauthorizedReason } from './auth/session'
import { ToastProvider } from './components/Toast'
import { queryClient } from './queryClient'
import { initAdminTheme } from './theme'

initAdminTheme()

// The token survives reloads until it expires (24 h).
configureApiClient({
  tokenStore: createLocalStorageTokenStore('minipolya-admin-token'),
  // Any 401 means the token is gone, expired or revoked by a password change
  // (TOKEN_REVOKED, its own notice): back to the login page.
  onUnauthorized: (error) => logout(unauthorizedReason(error)),
  // Can arrive from any endpoint at any time (the backend re-reads the flag).
  onAccountBlocked: () => logout('blocked'),
})

void restoreSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)
