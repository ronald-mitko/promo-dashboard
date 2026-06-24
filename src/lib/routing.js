// ─────────────────────────────────────────────
// ROUTING — resolve which RCSM owns a submission, by account/client
// ─────────────────────────────────────────────

// Resolve the owning RCSM id for a given chain/retailer. Matches on chain first
// (the parent account), then falls back to retailer name. Returns null if none.
export function resolveRcsmId(accountKey, rcsms) {
  if (!accountKey || !Array.isArray(rcsms)) return null
  const hit = rcsms.find((r) => (r.accounts || []).includes(accountKey))
  return hit ? hit.rcsmId : null
}

// Resolve the owning RCSM for a promotion/request that carries chain + retailer.
export function resolveRcsmForRecord(record, rcsms) {
  if (!record) return null
  return (
    resolveRcsmId(record.masterChain, rcsms) ||
    resolveRcsmId(record.chain, rcsms) ||
    resolveRcsmId(record.retailer, rcsms) ||
    resolveRcsmId(record.clientName, rcsms) ||
    null
  )
}

export function rcsmName(rcsmId, rcsms) {
  const hit = (rcsms || []).find((r) => r.rcsmId === rcsmId)
  return hit ? hit.name : 'Unassigned'
}
