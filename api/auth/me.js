// GET /api/auth/me → { configured, authenticated, user, name }
// `configured:false` means auth is off server-side, so the client stays open.
import { getSession, authConfigured } from '../../server/auth.js'

export default async function handler(req, res) {
  const session = getSession(req)
  return res.status(200).json({
    configured: authConfigured(),
    authenticated: !!session,
    user: session ? session.username : null,
    name: session ? session.name : null,
  })
}
