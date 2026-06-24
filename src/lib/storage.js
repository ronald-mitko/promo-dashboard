// ─────────────────────────────────────────────
// STORAGE helpers — safe load + additive migration
// ─────────────────────────────────────────────
import { STORAGE_KEYS, SCHEMA_VERSION, ROLES, SUBMISSION_STATUS } from './constants'

// Simple unique id generator (browser runtime — Date/Math are available here).
export function genId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

// Backfill new fields onto a stored promotion without touching existing values.
export function withPromoDefaults(p) {
  return {
    submission_status: SUBMISSION_STATUS.DRAFT,
    submitted_by: null,
    submitted_at: null,
    routed_rcsm: null,
    approval_history: [],
    priority_type: null,
    ...p,
  }
}

export function withPromoDefaultsAll(arr) {
  return Array.isArray(arr) ? arr.map(withPromoDefaults) : arr
}

// Derive the initial session from the legacy `advsol_user_name` key on first run.
export function loadInitialSession() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.session)
    if (stored) return JSON.parse(stored)
  } catch {
    /* ignore */
  }
  const legacyName = localStorage.getItem(STORAGE_KEYS.userName) || 'User'
  return { role: ROLES.HQ, userName: legacyName, rcsmId: null }
}

// One-time, additive migration. Never destructively rewrites promotions.
export function runMigration() {
  let version = 0
  try {
    version = parseInt(localStorage.getItem(STORAGE_KEYS.schemaVersion) || '1', 10)
  } catch {
    version = 1
  }
  if (version >= SCHEMA_VERSION) return

  try {
    // Backfill promotion defaults in place.
    const raw = localStorage.getItem(STORAGE_KEYS.promotions)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        localStorage.setItem(STORAGE_KEYS.promotions, JSON.stringify(withPromoDefaultsAll(parsed)))
      }
    }
    // Ensure new collections exist.
    if (!localStorage.getItem(STORAGE_KEYS.requests)) {
      localStorage.setItem(STORAGE_KEYS.requests, JSON.stringify([]))
    }
    localStorage.setItem(STORAGE_KEYS.schemaVersion, String(SCHEMA_VERSION))
  } catch {
    /* best-effort; load paths also apply defaults */
  }
}
