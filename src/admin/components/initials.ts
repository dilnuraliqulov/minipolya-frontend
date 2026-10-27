/** Up to two initials from a display name: "Aziz Rahimov" → "AR". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts
  return letters.map((part) => Array.from(part ?? '')[0]?.toUpperCase() ?? '').join('')
}
