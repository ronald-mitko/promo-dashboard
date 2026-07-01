// ─────────────────────────────────────────────
// /api/config — shared app config (JSON by key) in Vercel Postgres.
//   GET  ?key=rcsms     → { key, value }
//   POST { key, value } → upsert
// Used for RCSM ↔ chain ownership so routing is consistent across users.
// ─────────────────────────────────────────────
import { pgConfigured, getConfig, setConfig } from '../server/pg.js'
import { requireAuth } from '../server/auth.js'

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return
  if (!pgConfigured()) return res.status(503).json({ error: 'Postgres not configured' })
  try {
    if (req.method === 'GET') {
      const key = req.query.key
      if (!key) return res.status(400).json({ error: 'key is required' })
      return res.status(200).json({ key, value: await getConfig(key) })
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      const { key, value } = req.body || {}
      if (!key) return res.status(400).json({ error: 'key is required' })
      await setConfig(key, value)
      return res.status(200).json({ ok: true, key })
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) })
  }
}
