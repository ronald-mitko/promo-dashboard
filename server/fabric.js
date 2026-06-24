// ─────────────────────────────────────────────
// Fabric SQL connection (read-only reference data).
// Mirrors the workflag-submission api/src/db.js: tedious + Azure AD token.
// Credentials come from env (service principal in prod, az login locally).
// ─────────────────────────────────────────────
import Tedious from 'tedious'
import { DefaultAzureCredential, ClientSecretCredential } from '@azure/identity'

const { Connection, Request, TYPES } = Tedious
export { TYPES }

const credential =
  process.env.AAD_CLIENT_ID && process.env.AAD_CLIENT_SECRET
    ? new ClientSecretCredential(process.env.AAD_TENANT_ID, process.env.AAD_CLIENT_ID, process.env.AAD_CLIENT_SECRET)
    : new DefaultAzureCredential()

async function getToken() {
  const res = await credential.getToken('https://database.windows.net/.default')
  return res.token
}

function getConnection(database) {
  const server = process.env.FABRIC_SQL_SERVER
  const db = database || process.env.FABRIC_SQL_DATABASE
  return new Promise(async (resolve, reject) => {
    let token
    try {
      token = await getToken()
    } catch (err) {
      return reject(new Error(`Failed to acquire Azure AD token: ${err.message}`))
    }
    const connection = new Connection({
      server,
      authentication: { type: 'azure-active-directory-access-token', options: { token } },
      options: { encrypt: true, port: 1433, database: db || undefined, connectTimeout: 30000, requestTimeout: 60000 },
    })
    connection.on('connect', (err) => (err ? reject(err) : resolve(connection)))
    connection.connect()
  })
}

async function _queryOnce(sql, params, database) {
  const connection = await getConnection(database)
  return new Promise((resolve, reject) => {
    const rows = []
    const request = new Request(sql, (err) => {
      connection.close()
      if (err) return reject(err)
      resolve(rows)
    })
    for (const p of params) request.addParameter(p.name, p.type, p.value)
    request.on('row', (cols) => {
      const row = {}
      cols.forEach((c) => { row[c.metadata.colName] = c.value })
      rows.push(row)
    })
    connection.execSql(request)
  })
}

const MAX_RETRIES = 2
const isTransient = (err) => {
  const m = (err.message || '').toLowerCase()
  return ['timeout', 'econnreset', 'econnrefused', 'socket hang up', 'token'].some((s) => m.includes(s))
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Run a parameterized query (use @Name params), with transient retry.
export async function queryRows(sql, params = [], database) {
  let lastErr
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await _queryOnce(sql, params, database)
    } catch (err) {
      lastErr = err
      if (attempt < MAX_RETRIES && isTransient(err)) { await sleep(1000 * (attempt + 1)); continue }
      throw err
    }
  }
  throw lastErr
}

// Whether Fabric SQL env is configured (so endpoints can 503 cleanly otherwise).
export function fabricConfigured() {
  return !!process.env.FABRIC_SQL_SERVER
}

// YYYYMM for 12 months ago — MCC commitment cutoff (matches workflag).
export function getLast12PeriodStart() {
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() + 1 - 11
  if (month <= 0) { month += 12; year -= 1 }
  return year * 100 + month
}
