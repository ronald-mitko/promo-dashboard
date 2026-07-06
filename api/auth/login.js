// POST /api/auth/login  { username, password }
// Verifies against the Postgres users table and sets the session cookie.
import { verifyPassword, signSession, sessionCookie, authConfigured, ensureBootstrapAdmin } from '../../server/auth.js'
import { getUser } from '../../server/pg.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!authConfigured()) return res.status(503).json({ error: 'Auth not configured (set AUTH_SECRET; ensure Postgres)' })

  try {
    await ensureBootstrapAdmin()
    const { username, password } = req.body || {}
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' })

    const uname = String(username).trim().toLowerCase()
    const u = await getUser(uname)
    if (!u || !verifyPassword(password, u.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password.' })
    }

    const user = { username: u.username, name: u.name || u.username, admin: u.is_admin }
    res.setHeader('Set-Cookie', sessionCookie(signSession(user)))
    return res.status(200).json({ ok: true, user: user.username, name: user.name, admin: user.admin })
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) })
  }
}
