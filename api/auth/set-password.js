// POST /api/auth/set-password  { token, password }
// Public: redeem a one-time invite to set the account's password, then sign the
// user in (sets the session cookie).
import { hashToken, hashPassword, signSession, sessionCookie, authConfigured } from '../../server/auth.js'
import { consumeInvite, getUser, updateUser } from '../../server/pg.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!authConfigured()) return res.status(503).json({ error: 'Auth not configured' })

  try {
    const { token, password } = req.body || {}
    if (!token || !password) return res.status(400).json({ error: 'token and password are required' })
    if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })

    const username = await consumeInvite(hashToken(String(token)))
    if (!username) return res.status(400).json({ error: 'This link is invalid or has expired.' })

    await updateUser(username, { password_hash: hashPassword(password) })

    // Sign them in for a smooth first-run.
    const u = await getUser(username)
    const user = { username, name: (u && u.name) || username, admin: !!(u && u.is_admin) }
    res.setHeader('Set-Cookie', sessionCookie(signSession(user)))
    return res.status(200).json({ ok: true, user: user.username })
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) })
  }
}
