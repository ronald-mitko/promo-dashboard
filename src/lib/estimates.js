// ─────────────────────────────────────────────
// Effort / time estimates for the RCSM review.
// The RCSM judges cumulative minutes of rep work PER STORE for a client
// against a contracted figure they already know (not stored here).
// Only Priorities (by promo type) and Home Location Checks (40s/work flag) count.
// ─────────────────────────────────────────────
import { REQUEST_TYPES, SUBMISSION_STATUS } from './constants'

export const WORKFLAG_SECONDS_PER_FLAG = 40

export const PROMO_MINUTES_PER_CHECK = {
  TPR: 1,
  Feature: 5,
  Display: 7,
  'Feature and Display': 10,
  'Feature+Display': 10, // legacy seed value
}

// Minutes of rep work per store contributed by a single item (a promotion = 1
// item, so its per-store minutes = the per-type rate; a Home Location Check =
// itemCount × 40s per store). Authorize / support / reporting contribute 0.
export function perStoreMinutes(item) {
  if (!item) return 0
  if (item.type === REQUEST_TYPES.WORKFLAG) return (item.itemCount || 0) * (WORKFLAG_SECONDS_PER_FLAG / 60)
  if (item.promo_type) return PROMO_MINUTES_PER_CHECK[item.promo_type] ?? 0
  return 0
}

// Work-flag stats for a Home Location Check request.
export function workflagStats(req) {
  const perStoreFlags = req.itemCount || 0
  const totalFlags = req.totalRows || (req.storeCount || 0) * perStoreFlags
  return {
    perStoreFlags,
    avg: perStoreFlags,
    max: perStoreFlags,
    min: perStoreFlags,
    totalFlags,
    perStoreMinutes: perStoreFlags * (WORKFLAG_SECONDS_PER_FLAG / 60),
    estTotalMinutes: Math.ceil((totalFlags * WORKFLAG_SECONDS_PER_FLAG) / 60),
  }
}

// Cumulative est. minutes per store for a client = sum over the client's
// submitted + approved priorities and home location checks.
export function clientLoadPerStore(items) {
  return (items || [])
    .filter((i) => {
      const s = i.submission_status || i.status
      return s === SUBMISSION_STATUS.SUBMITTED || s === SUBMISSION_STATUS.APPROVED
    })
    .reduce((sum, i) => sum + perStoreMinutes(i), 0)
}

export function fmtMinutes(min) {
  if (!min) return '0 min'
  return `${Math.round(min * 10) / 10} min`
}
