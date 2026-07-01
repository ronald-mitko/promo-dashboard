// ─────────────────────────────────────────────
// Username + password auth (no external deps — Node crypto only).
//
// Users are defined in the AUTH_USERS env var as a JSON array, e.g.
//   AUTH_USERS=[{"username":"ron.mitko","password":"…","name":"Ron Mitko","admin":true}]
// You provision the roster in Vercel; to change a password, edit the env var.
//
// Rollout-safe: auth is "configured" only when AUTH_SECRET is set AND at least
// one user exists. Until then requireAuth() treats requests as open, so the app
// behaves exactly as it did before auth existed.
// ─────────────────────────────────────────────
import crypto from 'node:crypto'

const COOKIE = 'hqrc_session'
const SESSION_TTL_SEC = 7 * 24 * 60 * 60 // 7 days

const secret = () => process.env.AUTH_SECRET || ''

export function getUsers() {
  try {
    const arr = JSON.parse(process.env.AUTH_USERS || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}
export function authConfigured() {
  return !!process.env.AUTH_SECRET && getUsers().length > 0
}

// Constant-time string compare (equalizes timing even on length mismatch).
function constantTimeEqual(a, b) {
  const ba = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ba.length !== bb.length) { crypto.timingSafeEqual(ba, ba); return false }
  return crypto.timingSafeEqual(ba, bb)
}

// Verify credentials against the env roster. Returns { username, name, admin } or null.
export function verifyCredentials(username, password) {
  const uname = String(username || '').trim().toLowerCase()
  const user = getUsers().find((u) => String(u.username || '').trim().toLowerCase() === uname)
  if (!user) { constantTimeEqual(password, password); return null } // dummy compare to equalize timing
  if (!constantTimeEqual(password, user.password)) return null
  return { username: user.username, name: user.name || user.username, admin: !!user.admin }
}

// ── Session token: compact HMAC-signed payload (base64url(payload).base64url(sig)) ──
export function signSession(user, ttlSec = SESSION_TTL_SEC) {
  const body = { sub: user.username, name: user.name || user.username, admin: !!user.admin, exp: Math.floor(Date.now() / 1000) + ttlSec }
  const payload = Buffer.from(JSON.stringify(body)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}
export function verifySession(token) {
  if (!token || !secret()) return null
  const [payload, sig] = String(token).split('.')
  if (!payload || !sig) return null
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
  const a = Buffer.from(sig), b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  let data
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) } catch { return null }
  if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null
  return { username: data.sub, name: data.name, admin: !!data.admin }
}

// ── Cookies ──
export function sessionCookie(token, maxAgeSec = SESSION_TTL_SEC) {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}`
}
export function clearCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}
export function parseCookies(req) {
  const out = {}
  const raw = req.headers.cookie || ''
  raw.split(';').forEach((part) => {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  })
  return out
}
export function getSession(req) {
  return verifySession(parseCookies(req)[COOKIE])
}

// Gate a request. Returns the session (or a sentinel when auth is off), or writes
// a 401 and returns null. Usage: `if (!requireAuth(req, res)) return`.
export function requireAuth(req, res) {
  if (!authConfigured()) return { open: true }
  const s = getSession(req)
  if (!s) { res.status(401).json({ error: 'Authentication required' }); return null }
  return s
}
