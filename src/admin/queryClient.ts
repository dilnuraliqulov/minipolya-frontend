import { createQueryClient } from '../shared/api'

/** The admin panel's single query client; logout clears it. */
export const queryClient = createQueryClient()
