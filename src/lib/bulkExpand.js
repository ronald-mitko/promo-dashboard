// ─────────────────────────────────────────────
// Expand bulk Home Location Check records: each chain → its stores, using the
// site's reference data (so HQ uploads by chain, and it lands as stores).
// ─────────────────────────────────────────────
import { apiEnabled, reference } from './api'
import { SEED_TEAMS } from './seed'

const teamIdByName = (name) => (SEED_TEAMS.find((t) => t.name === String(name || '').trim()) || {}).id || ''

export async function expandWorkflagStores(records, seed) {
  // Offline/seed: match seed stores by chain name (best-effort for local dev).
  if (!apiEnabled()) {
    return records.map((r) => {
      const stores = (seed?.stores || [])
        .filter((s) => r.chains.includes(s.artsChainName))
        .map((s) => s.storeId)
      return { ...r, teamId: teamIdByName(r.teamName), stores, storeCount: stores.length, totalRows: stores.length * r.items.length }
    })
  }

  // Live: resolve client → chainIds → stores per record.
  const out = []
  for (const r of records) {
    const teamId = teamIdByName(r.teamName)
    let stores = []
    try {
      const clients = await reference.clients(teamId)
      const client = (clients || []).find((c) => String(c.name).trim() === String(r.clientName).trim())
      if (client) {
        const chainRows = await reference.chains(teamId, client.clientId)
        const chainIds = (chainRows || []).filter((c) => r.chains.includes(c.chain)).map((c) => c.chainId)
        if (chainIds.length) {
          const storeRows = await reference.stores(teamId, client.clientId, chainIds)
          stores = (storeRows || []).map((s) => s.storeId)
        }
      }
    } catch { /* leave stores empty; surfaced as a 0-store warning in the preview */ }
    out.push({ ...r, teamId, stores, storeCount: stores.length, totalRows: stores.length * r.items.length })
  }
  return out
}
