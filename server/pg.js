// ─────────────────────────────────────────────
// Submission storage in Vercel Postgres.
// One table holds both priorities (kind='promotion') and workflow requests
// (kind='request'); the full record lives in the JSONB payload.
// Connection string is auto-injected by Vercel as POSTGRES_URL.
// ─────────────────────────────────────────────
import { sql } from '@vercel/postgres'

export function pgConfigured() {
  return !!process.env.POSTGRES_URL
}

let schemaReady = false
export async function ensureSchema() {
  if (schemaReady) return
  await sql`
    CREATE TABLE IF NOT EXISTS submissions (
      id            TEXT PRIMARY KEY,
      kind          TEXT NOT NULL,
      type          TEXT,
      status        TEXT NOT NULL DEFAULT 'draft',
      routed_rcsm   TEXT,
      submitted_by  TEXT,
      payload       JSONB NOT NULL,
      history       JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
  schemaReady = true
}

// List submissions with optional filters; newest first. Returns the stored
// payloads (with id/kind/type/status/routed_rcsm merged in for convenience).
export async function listSubmissions({ kind, routedRcsm, status } = {}) {
  await ensureSchema()
  const where = []
  const params = []
  if (kind) { params.push(kind); where.push(`kind = $${params.length}`) }
  if (routedRcsm) { params.push(routedRcsm); where.push(`routed_rcsm = $${params.length}`) }
  if (status) { params.push(status); where.push(`status = $${params.length}`) }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const { rows } = await sql.query(`SELECT * FROM submissions ${clause} ORDER BY created_at DESC`, params)
  return rows.map(rowToRecord)
}

function rowToRecord(r) {
  return { ...r.payload, id: r.id, kind: r.kind, type: r.type, status: r.status, routed_rcsm: r.routed_rcsm, submitted_by: r.submitted_by, history: r.history, created_at: r.created_at }
}

// Insert (or replace) a submission. `rec` is the full app record.
export async function upsertSubmission({ id, kind, type, status, routed_rcsm, submitted_by, payload, history }) {
  await ensureSchema()
  await sql`
    INSERT INTO submissions (id, kind, type, status, routed_rcsm, submitted_by, payload, history)
    VALUES (${id}, ${kind}, ${type || null}, ${status || 'draft'}, ${routed_rcsm || null}, ${submitted_by || null}, ${JSON.stringify(payload || {})}::jsonb, ${JSON.stringify(history || [])}::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      routed_rcsm = EXCLUDED.routed_rcsm,
      submitted_by = EXCLUDED.submitted_by,
      payload = EXCLUDED.payload,
      history = EXCLUDED.history,
      updated_at = now()`
  return { id }
}

// Remove a submission (propagates a client-side delete). No-op if id is absent.
export async function deleteSubmission(id) {
  await ensureSchema()
  await sql`DELETE FROM submissions WHERE id = ${id}`
  return { id }
}

// ── Users (username/password accounts; password_hash is scrypt, set by auth.js) ──
let usersSchemaReady = false
export async function ensureUsersSchema() {
  if (usersSchemaReady) return
  await sql`CREATE TABLE IF NOT EXISTS users (
    username       TEXT PRIMARY KEY,
    password_hash  TEXT NOT NULL,
    name           TEXT,
    is_admin       BOOLEAN NOT NULL DEFAULT false,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  )`
  usersSchemaReady = true
}
export async function getUser(username) {
  await ensureUsersSchema()
  const { rows } = await sql`SELECT * FROM users WHERE username = ${username}`
  return rows[0] || null
}
export async function listUsers() {
  await ensureUsersSchema()
  const { rows } = await sql`SELECT username, name, is_admin, created_at FROM users ORDER BY username`
  return rows
}
export async function createUser({ username, password_hash, name, is_admin }) {
  await ensureUsersSchema()
  const { rowCount } = await sql`
    INSERT INTO users (username, password_hash, name, is_admin)
    VALUES (${username}, ${password_hash}, ${name || username}, ${!!is_admin})
    ON CONFLICT (username) DO NOTHING`
  return { username, created: rowCount > 0 }
}
export async function updateUser(username, { password_hash, name, is_admin }) {
  await ensureUsersSchema()
  const sets = []
  const params = []
  if (password_hash !== undefined) { params.push(password_hash); sets.push(`password_hash = $${params.length}`) }
  if (name !== undefined) { params.push(name); sets.push(`name = $${params.length}`) }
  if (is_admin !== undefined) { params.push(is_admin); sets.push(`is_admin = $${params.length}`) }
  if (!sets.length) return { username }
  params.push(username)
  await sql.query(`UPDATE users SET ${sets.join(', ')}, updated_at = now() WHERE username = $${params.length}`, params)
  return { username }
}
export async function deleteUser(username) {
  await ensureUsersSchema()
  await sql`DELETE FROM users WHERE username = ${username}`
  return { username }
}
export async function countAdmins() {
  await ensureUsersSchema()
  const { rows } = await sql`SELECT COUNT(*)::int AS n FROM users WHERE is_admin = true`
  return rows[0].n
}

// ── Invite tokens (set-password links; one-time, short-lived, hash-only) ──
let invitesSchemaReady = false
export async function ensureInvitesSchema() {
  if (invitesSchemaReady) return
  await sql`CREATE TABLE IF NOT EXISTS invites (
    token_hash  TEXT PRIMARY KEY,
    username    TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`
  invitesSchemaReady = true
}
export async function createInvite(tokenHash, username, expiresAt) {
  await ensureInvitesSchema()
  await sql`INSERT INTO invites (token_hash, username, expires_at) VALUES (${tokenHash}, ${username}, ${expiresAt})`
}
// Validate without consuming (for showing the username on the set-password page).
export async function peekInvite(tokenHash) {
  await ensureInvitesSchema()
  const { rows } = await sql`SELECT username FROM invites WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > now()`
  return rows[0] ? rows[0].username : null
}
// Atomically claim the token; returns username on success (marks used), else null.
export async function consumeInvite(tokenHash) {
  await ensureInvitesSchema()
  const { rows } = await sql`
    UPDATE invites SET used_at = now()
    WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > now()
    RETURNING username`
  return rows[0] ? rows[0].username : null
}

// ── Shared app config (e.g. RCSM ↔ chain ownership) as JSON by key ──
let configReady = false
export async function ensureConfigSchema() {
  if (configReady) return
  await sql`CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`
  configReady = true
}
export async function getConfig(key) {
  await ensureConfigSchema()
  const { rows } = await sql`SELECT value FROM app_config WHERE key = ${key}`
  return rows[0] ? rows[0].value : null
}
export async function setConfig(key, value) {
  await ensureConfigSchema()
  await sql`INSERT INTO app_config (key, value) VALUES (${key}, ${JSON.stringify(value)}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`
  return { key }
}

// Patch status/routing/history (approve, reject, submit).
export async function patchSubmission(id, { status, routed_rcsm, history, payload }) {
  await ensureSchema()
  const sets = []
  const params = []
  if (status !== undefined) { params.push(status); sets.push(`status = $${params.length}`) }
  if (routed_rcsm !== undefined) { params.push(routed_rcsm); sets.push(`routed_rcsm = $${params.length}`) }
  if (history !== undefined) { params.push(JSON.stringify(history)); sets.push(`history = $${params.length}::jsonb`) }
  if (payload !== undefined) { params.push(JSON.stringify(payload)); sets.push(`payload = $${params.length}::jsonb`) }
  if (!sets.length) return { id }
  params.push(id)
  await sql.query(`UPDATE submissions SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length}`, params)
  return { id }
}
