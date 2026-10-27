import { QueryClient } from '@tanstack/react-query'
import { isApiError } from './ApiError'

const MAX_RETRIES = 2

/** 4xx answers will not change on retry; network failures and 5xx might. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.isClientError) return false
  return failureCount < MAX_RETRIES
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Mutations move money and book slots — never repeat them silently.
        retry: false,
      },
    },
  })
}
