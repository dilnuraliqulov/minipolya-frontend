import { useLocation, useNavigate } from 'react-router'

/**
 * Back navigation for a sub-screen: the previous screen, or `fallback` when
 * the app was opened right here (a deep link from an invite or a share).
 */
export function useGoBack(fallback = '/'): () => void {
  const navigate = useNavigate()
  const location = useLocation()
  return () => {
    if (location.key === 'default') navigate(fallback, { replace: true })
    else navigate(-1)
  }
}
