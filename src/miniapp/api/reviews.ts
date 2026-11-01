import { api, type Page } from '../../shared/api'
import type { Review } from './stadiums'

/** `ReviewResponse` — the same shape the stadium page lists. */
export type MyReview = Review

export const MY_REVIEWS_KEY = ['reviews', 'my'] as const

/** Newest first. */
export function getMyReviews(): Promise<Page<MyReview>> {
  return api.get<Page<MyReview>>('/api/reviews/my')
}

export interface PostReviewBody {
  stadiumId: string
  bookingId?: string
  /** 1–5 */
  rating: number
  /** At most 2000 characters. */
  comment?: string
}

export function postReview(body: PostReviewBody): Promise<MyReview> {
  return api.post<MyReview>('/api/reviews', body)
}
