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

// RCSMs own clients, so a submission routes to the RCSM who owns its client.
export function resolveRcsmForRecord(record, rcsms) {
  if (!record) return null
  return (
    resolveRcsmId(record.clientName, rcsms) ||
    resolveRcsmId(record.clientId, rcsms) ||
    null
  )
}

export function rcsmName(rcsmId, rcsms) {
  const hit = (rcsms || []).find((r) => r.rcsmId === rcsmId)
  return hit ? hit.name : 'Unassigned'
}
