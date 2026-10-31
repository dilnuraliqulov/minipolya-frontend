import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getOwnerStadiums } from '../api/owner'
import { getMe, updateMe, updateProfile, type UpdateProfileRequest, type User } from '../api/users'
import { setLanguage } from '../i18n'

export const ME_KEY = ['me'] as const

/** GET /api/users/me — the live profile (language, role flags, phone). */
export function useMe() {
  return useQuery({ queryKey: ME_KEY, queryFn: getMe })
}

/** The owner's stadiums; only requested for a user whose profile says isOwner. */
export function useOwnerStadiums(enabled: boolean) {
  return useQuery({ queryKey: ['owner', 'stadiums'], queryFn: getOwnerStadiums, enabled })
}

export function useUpdateLanguage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (language: string) => updateMe({ language }),
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
