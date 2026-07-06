// /api/auth/invite
//   POST (admin)  { username }  → create a set-password link for an existing user
//   GET  (public) ?token=       → { username } if the token is valid (no consume)
import { requireAdmin, authConfigured, issueInvite, hashToken } from '../../server/auth.js'
import { getUser, peekInvite } from '../../server/pg.js'

export default async function handler(req, res) {
  if (!authConfigured()) return res.status(503).json({ error: 'Auth not configured' })

  try {
    if (req.method === 'GET') {
      const token = String(req.query.token || '')
      if (!token) return res.status(400).json({ error: 'token is required' })
      const username = await peekInvite(hashToken(token))
      if (!username) return res.status(400).json({ error: 'This link is invalid or has expired.' })
      return res.status(200).json({ username })
    }

    if (req.method === 'POST') {
      const admin = requireAdmin(req, res)
      if (!admin) return
      const uname = String((req.body || {}).username || '').trim().toLowerCase()
      if (!uname) return res.status(400).json({ error: 'username is required' })
      if (!(await getUser(uname))) return res.status(404).json({ error: 'User not found.' })
      const link = await issueInvite(req, uname)
      return res.status(200).json({ ok: true, username: uname, link })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) })
  }
}
