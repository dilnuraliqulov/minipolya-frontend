/** `none` | `pending` | `signed` (api-reference §1.9) → their translation keys. */
export const CONTRACT_STATUS_KEYS: Record<
  string,
  'owner.contract.status.none' | 'owner.contract.status.pending' | 'owner.contract.status.signed'
> = {
  none: 'owner.contract.status.none',
  pending: 'owner.contract.status.pending',
  signed: 'owner.contract.status.signed',
}

/** `yatt` | `mchj` | `self_employed` → their translation keys. */
export const LEGAL_TYPE_KEYS: Record<
  string,
  'owner.contract.legal.yatt' | 'owner.contract.legal.mchj' | 'owner.contract.legal.self_employed'
> = {
  yatt: 'owner.contract.legal.yatt',
  mchj: 'owner.contract.legal.mchj',
  self_employed: 'owner.contract.legal.self_employed',
}
