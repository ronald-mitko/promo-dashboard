// POST /api/auth/login  { username, password }
// Verifies credentials against the AUTH_USERS roster and sets the session cookie.
import { verifyCredentials, signSession, sessionCookie, authConfigured } from '../../server/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!authConfigured()) return res.status(503).json({ error: 'Auth not configured (set AUTH_SECRET and AUTH_USERS)' })

  try {
    const { username, password } = req.body || {}
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' })

    const user = verifyCredentials(username, password)
    if (!user) return res.status(401).json({ error: 'Invalid username or password.' })

    res.setHeader('Set-Cookie', sessionCookie(signSession(user)))
    return res.status(200).json({ ok: true, user: user.username, name: user.name })
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) })
  }
}
