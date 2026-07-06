// /api/auth/users — admin-only user management (Postgres).
//   GET                                   → list users
//   POST   { username, password, name, admin }  → create
//   PATCH  { username, password?, name?, admin? } → update (reset pw / rename / role)
//   DELETE ?username=                     → remove
import { requireAdmin, authConfigured, hashPassword, newToken, issueInvite } from '../../server/auth.js'
import { listUsers, getUser, createUser, updateUser, deleteUser, countAdmins } from '../../server/pg.js'

export default async function handler(req, res) {
  if (!authConfigured()) return res.status(503).json({ error: 'Auth not configured' })
  const admin = requireAdmin(req, res)
  if (!admin) return

  try {
    if (req.method === 'GET') {
      return res.status(200).json(await listUsers())
    }

    if (req.method === 'POST') {
      const { username, password, name, admin: isAdmin } = req.body || {}
      const uname = String(username || '').trim().toLowerCase()
      if (!uname) return res.status(400).json({ error: 'Username is required.' })
      if (password && String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })
      if (await getUser(uname)) return res.status(409).json({ error: 'That username already exists.' })

      // With a password → set it directly. Without → create with an unusable
      // random hash and return a one-time invite link for the user to self-set.
      const password_hash = hashPassword(password || newToken())
      await createUser({ username: uname, password_hash, name, is_admin: !!isAdmin })
      const link = password ? null : await issueInvite(req, uname)
      return res.status(200).json({ ok: true, username: uname, link })
    }

    if (req.method === 'PATCH') {
      const { username, password, name, admin: isAdmin } = req.body || {}
      const uname = String(username || '').trim().toLowerCase()
      const target = uname ? await getUser(uname) : null
      if (!target) return res.status(404).json({ error: 'User not found.' })
      // Don't let the last admin be demoted.
      if (isAdmin === false && target.is_admin && (await countAdmins()) <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin.' })
      }
      const patch = {}
      if (name !== undefined) patch.name = name
      if (isAdmin !== undefined) patch.is_admin = !!isAdmin
      if (password) {
        if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })
        patch.password_hash = hashPassword(password)
      }
      await updateUser(uname, patch)
      return res.status(200).json({ ok: true, username: uname })
    }

    if (req.method === 'DELETE') {
      const uname = String(req.query.username || '').trim().toLowerCase()
      if (!uname) return res.status(400).json({ error: 'username is required' })
      if (uname === String(admin.username).toLowerCase()) return res.status(400).json({ error: 'You cannot delete your own account.' })
      const target = await getUser(uname)
      if (!target) return res.status(404).json({ error: 'User not found.' })
      if (target.is_admin && (await countAdmins()) <= 1) return res.status(400).json({ error: 'Cannot delete the last admin.' })
      await deleteUser(uname)
      return res.status(200).json({ ok: true, username: uname })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) })
  }
}
