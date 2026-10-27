import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { configureApiClient, createLocalStorageTokenStore, createQueryClient } from '../shared/api'
import '../shared/theme/index.css'
import './fonts.css'
import { App } from './App'
import { initAdminTheme } from './theme'

initAdminTheme()

// The token survives reloads until it expires (24 h).
configureApiClient({ tokenStore: createLocalStorageTokenStore('minipolya-admin-token') })

const queryClient = createQueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
