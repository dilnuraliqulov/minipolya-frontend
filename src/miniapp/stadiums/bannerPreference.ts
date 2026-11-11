/** Display preference: `'1'` once the player has closed the why-us carousel on this device. */
export const WHY_US_HIDDEN_KEY = 'minipolya-miniapp-why-us-hidden'

export function isWhyUsHidden(): boolean {
  try {
    return localStorage.getItem(WHY_US_HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}

export function rememberWhyUsHidden(): void {
  try {
    localStorage.setItem(WHY_US_HIDDEN_KEY, '1')
  } catch {
    // Storage blocked: the carousel stays closed for this session only.
  }
}
