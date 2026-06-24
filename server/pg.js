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
