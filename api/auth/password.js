// POST /api/auth/password  { currentPassword, newPassword }
// Self-service password change for the signed-in user.
import { getSession, verifyPassword, hashPassword, authConfigured } from '../../server/auth.js'
import { getUser, updateUser } from '../../server/pg.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!authConfigured()) return res.status(503).json({ error: 'Auth not configured' })

  const session = getSession(req)
  if (!session) return res.status(401).json({ error: 'Authentication required' })

  try {
    const { currentPassword, newPassword } = req.body || {}
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password are required.' })
    if (String(newPassword).length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' })

    const u = await getUser(session.username)
    if (!u || !verifyPassword(currentPassword, u.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect.' })
    }
    await updateUser(session.username, { password_hash: hashPassword(newPassword) })
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) })
  }
}
