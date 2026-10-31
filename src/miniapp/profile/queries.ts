import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { getOwnerStadiums } from '../api/owner'
import { getMe, updateMe, updateProfile, type UpdateProfileRequest, type User } from '../api/users'
import { setLanguage } from '../i18n'

export const ME_KEY = ['me'] as const

/**
 * GET /api/users/me — the live profile (language, role flags, phone).
 * The app's language follows the saved `user.language` whenever it loads.
 */
export function useMe() {
  const query = useQuery({ queryKey: ME_KEY, queryFn: getMe })
  const language = query.data?.language
  useEffect(() => {
    if (language) void setLanguage(language)
  }, [language])
  return query
}

/** The owner's stadiums; only requested for a user whose profile says isOwner. */
export function useOwnerStadiums(enabled: boolean) {
  return useQuery({ queryKey: ['owner', 'stadiums'], queryFn: getOwnerStadiums, enabled })
}

/**
 * Profil → Til: switches at once (the cached profile and i18n), saves with
 * PATCH /users/me, and goes back to the saved language if the save fails.
 */
export function useUpdateLanguage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (language: string) => updateMe({ language }),
    onMutate: async (language: string) => {
      await queryClient.cancelQueries({ queryKey: ME_KEY })
      const previous = queryClient.getQueryData<User>(ME_KEY)
      if (previous) queryClient.setQueryData<User>(ME_KEY, { ...previous, language })
      await setLanguage(language)
      return { previous }
    },
    onError: async (_error, _language, context) => {
      if (!context?.previous) return
      queryClient.setQueryData(ME_KEY, context.previous)
      await setLanguage(context.previous.language)
    },
    onSuccess: async (user: User) => {
      queryClient.setQueryData(ME_KEY, user)
      await setLanguage(user.language)
    },
  })
}

/** R20 — only usable when `isAvailable(PROFILE_FIELDS)`. */
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => updateProfile(body),
    onSuccess: (user: User) => {
      queryClient.setQueryData(ME_KEY, user)
    },
  })
}
