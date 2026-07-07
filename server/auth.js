// ─────────────────────────────────────────────
// Username + password auth (no external deps — Node crypto only).
//
// Accounts live in the Postgres `users` table with scrypt-hashed passwords.
// A first admin is bootstrapped from AUTH_BOOTSTRAP_USER / AUTH_BOOTSTRAP_PASSWORD
// on demand; from there admins manage the roster in-app.
//
// Rollout-safe: auth is "configured" only when AUTH_SECRET is set AND Postgres is
// configured. Until then requireAuth() treats requests as open, so the app
// behaves exactly as it did before auth existed.
// ─────────────────────────────────────────────
import crypto from 'node:crypto'
import { pgConfigured, getUser, createUser, createInvite } from './pg.js'

const COOKIE = 'hqrc_session'
const SESSION_TTL_SEC = 7 * 24 * 60 * 60 // 7 days

const secret = () => process.env.AUTH_SECRET || ''

export function authConfigured() {
  return !!process.env.AUTH_SECRET && pgConfigured()
}

// ── Password hashing (scrypt: "scrypt$<saltHex>$<hashHex>") ──
export function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(String(password), salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}
export function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const salt = Buffer.from(parts[1], 'hex')
  const expected = Buffer.from(parts[2], 'hex')
  let actual
  try { actual = crypto.scryptSync(String(password), salt, expected.length) } catch { return false }
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

// Create the bootstrap admin if configured and not already present. Idempotent.
export async function ensureBootstrapAdmin() {
  const uname = String(process.env.AUTH_BOOTSTRAP_USER || '').trim().toLowerCase()
  const pw = process.env.AUTH_BOOTSTRAP_PASSWORD || ''
  if (!uname || !pw) return
  const existing = await getUser(uname)
  if (existing) return
  await createUser({ username: uname, password_hash: hashPassword(pw), name: process.env.AUTH_BOOTSTRAP_NAME || uname, email: process.env.AUTH_BOOTSTRAP_EMAIL || null, is_admin: true })
}

// ── One-time invite tokens (raw token goes in the link; only the hash is stored) ──
export function newToken() {
  return crypto.randomBytes(32).toString('base64url')
}
export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}
// Absolute base URL of the deployment, from proxy headers.
export function baseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`
}
// The set-password link the admin copies (SPA reads ?invite=<token> at the root).
export function inviteLink(req, token) {
  return `${baseUrl(req)}/?invite=${encodeURIComponent(token)}`
}
// Create a one-time invite for a username and return the copyable link.
export async function issueInvite(req, username, ttlSec = 7 * 24 * 60 * 60) {
  const token = newToken()
  const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString()
  await createInvite(hashToken(token), username, expiresAt)
  return inviteLink(req, token)
}

// ── Session token: compact HMAC-signed payload (base64url(payload).base64url(sig)) ──
export function signSession(user, ttlSec = SESSION_TTL_SEC) {
  const body = { sub: user.username, name: user.name || user.username, email: user.email || null, admin: !!user.admin, exp: Math.floor(Date.now() / 1000) + ttlSec }
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
  return { username: data.sub, name: data.name, email: data.email || null, admin: !!data.admin }
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

// Gate an admin-only endpoint. Returns the session or writes 401/403 and null.
export function requireAdmin(req, res) {
  const s = getSession(req)
  if (!s) { res.status(401).json({ error: 'Authentication required' }); return null }
  if (!s.admin) { res.status(403).json({ error: 'Admin access required' }); return null }
  return s
}
