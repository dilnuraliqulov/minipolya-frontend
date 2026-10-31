import { api } from '../../shared/api'

/** The fields of `StadiumResponse` the Mini App reads from the owner's list so far. */
export interface OwnerStadium {
  id: string
  name: string
  /** `pending` | `approved` | `rejected` | `blocked` */
  status: string
}

export const OWNER_STADIUMS = 'GET /api/owner/stadiums'

/** The calling owner's stadiums, any status (not paged). Needs the `isOwner` claim. */
export function getOwnerStadiums(): Promise<OwnerStadium[]> {
  return api.get<OwnerStadium[]>('/api/owner/stadiums')
}
