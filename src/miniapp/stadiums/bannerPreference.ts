/** Display preference: `'1'` once the player has closed the Info Banner. */
export const BANNER_HIDDEN_KEY = 'minipolya-miniapp-banner-hidden'

export function isBannerHidden(): boolean {
  try {
    return localStorage.getItem(BANNER_HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}

export function rememberBannerHidden(): void {
  try {
    localStorage.setItem(BANNER_HIDDEN_KEY, '1')
  } catch {
    // Storage blocked: the banner stays closed for this session only.
  }
}
