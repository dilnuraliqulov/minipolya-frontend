import { formatSom } from '../../../shared/format'

/** "8f3a…9c21" — enough to recognise; the whole id is one click away. */
export const shortTxn = (id: string) => (id.length > 10 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id)

/** Money with a real minus sign for refunds: "−200 000 so'm". */
export function money(tiyin: number): string {
  return formatSom(tiyin).replace(/^-/, '−')
}
