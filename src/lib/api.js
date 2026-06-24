// ─────────────────────────────────────────────
// Client for the serverless API (/api/*). When VITE_API !== '1' the app stays
// fully on seed data + localStorage, so local dev works with no backend.
// ─────────────────────────────────────────────

export function apiEnabled() {
  return import.meta.env.VITE_API === '1'
}

async function getJson(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`GET ${url} → ${r.status}`)
  return r.json()
}

// ── Reference data (Fabric SQL) ──
export const reference = {
  teams: () => getJson('/api/reference?resource=teams'),
  clients: (teamId) => getJson(`/api/reference?resource=clients&teamId=${encodeURIComponent(teamId)}`),
  chains: (teamId, clientId) => getJson(`/api/reference?resource=chains&teamId=${encodeURIComponent(teamId)}&clientId=${encodeURIComponent(clientId)}`),
  authChains: (teamId) => getJson(`/api/reference?resource=authChains&teamId=${encodeURIComponent(teamId)}`),
  stores: (teamId, clientId, chainIds) => getJson(`/api/reference?resource=stores&teamId=${encodeURIComponent(teamId)}&clientId=${encodeURIComponent(clientId)}&chainId=${encodeURIComponent((chainIds || []).join(','))}`),
  items: (teamId, clientId, chainIds = []) => getJson(`/api/reference?resource=items&teamId=${encodeURIComponent(teamId)}&clientId=${encodeURIComponent(clientId)}${chainIds.length ? `&chainId=${encodeURIComponent(chainIds.join(','))}` : ''}`),
}

// ── Submissions (Vercel Postgres) ──
export async function listSubmissions(filters = {}) {
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v != null)).toString()
  return getJson(`/api/submissions${qs ? `?${qs}` : ''}`)
}

export async function saveSubmission(rec) {
  const r = await fetch('/api/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) })
  if (!r.ok) throw new Error(`save → ${r.status}`)
  return r.json()
}

// Map an app object to the stored submission record.
export function toSubmissionRecord(obj, kind) {
  if (kind === 'promotion') {
    return { id: obj.promo_id, kind: 'promotion', type: null, status: obj.submission_status, routed_rcsm: obj.routed_rcsm, submitted_by: obj.submitted_by, payload: obj, history: obj.approval_history || [] }
  }
  return { id: obj.requestId, kind: 'request', type: obj.type, status: obj.status, routed_rcsm: obj.routed_rcsm, submitted_by: obj.submittedBy, payload: obj, history: obj.approval_history || [] }
}
