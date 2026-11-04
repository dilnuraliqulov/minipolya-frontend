import { useQuery } from '@tanstack/react-query'
import {
  closuresKey,
  getClosures,
  getOwnerLegal,
  getOwnerStadium,
  getOwnerStadiums,
  getOwnerStats,
  getPricing,
  getSchedule,
  OWNER_LEGAL_KEY,
  OWNER_STADIUMS_KEY,
  ownerStadiumKey,
  pricingKey,
  scheduleKey,
  statsKey,
} from '../api/owner'

export function useOwnerStadiumList() {
  return useQuery({ queryKey: OWNER_STADIUMS_KEY, queryFn: getOwnerStadiums })
}

export function usePricing(stadiumId: string) {
  return useQuery({ queryKey: pricingKey(stadiumId), queryFn: () => getPricing(stadiumId) })
}

export function useClosures(stadiumId: string) {
  return useQuery({ queryKey: closuresKey(stadiumId), queryFn: () => getClosures(stadiumId) })
}

export function useSchedule(stadiumId: string, date: string) {
  return useQuery({
    queryKey: scheduleKey(stadiumId, date),
    queryFn: () => getSchedule(stadiumId, date),
  })
}

export function useOwnerStats(stadiumId: string) {
  return useQuery({ queryKey: statsKey(stadiumId), queryFn: () => getOwnerStats(stadiumId) })
}

export function useOwnerLegal() {
  return useQuery({ queryKey: OWNER_LEGAL_KEY, queryFn: getOwnerLegal })
}

/** R35: the stadium's full settings in the owner's view. */
export function useOwnerStadiumDetail(id: string) {
  return useQuery({ queryKey: ownerStadiumKey(id), queryFn: () => getOwnerStadium(id) })
}
