// ─────────────────────────────────────────────
// /api/submissions — persist priorities & workflow requests in Vercel Postgres.
//   GET    ?kind=&rcsmId=&status=   → list (newest first)
//   POST   { id, kind, type, status, routed_rcsm, submitted_by, payload, history }
//   PATCH  { id, status?, routed_rcsm?, history?, payload? }
// ─────────────────────────────────────────────
import { pgConfigured, listSubmissions, upsertSubmission, patchSubmission } from '../server/pg.js'

export default async function handler(req, res) {
  if (!pgConfigured()) return res.status(503).json({ error: 'Postgres not configured (create a Vercel Postgres store)' })

  try {
    if (req.method === 'GET') {
      const rows = await listSubmissions({ kind: req.query.kind, routedRcsm: req.query.rcsmId, status: req.query.status })
      return res.status(200).json(rows)
    }
    if (req.method === 'POST') {
      const rec = req.body || {}
      if (!rec.id || !rec.kind) return res.status(400).json({ error: 'id and kind are required' })
      await upsertSubmission(rec)
      return res.status(200).json({ ok: true, id: rec.id })
    }
    if (req.method === 'PATCH') {
      const { id, ...patch } = req.body || {}
      if (!id) return res.status(400).json({ error: 'id is required' })
      await patchSubmission(id, patch)
      return res.status(200).json({ ok: true, id })
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) })
  }
}
