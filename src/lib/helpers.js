// ─────────────────────────────────────────────
// Shared formatting + small domain helpers (used by App.jsx and views)
// ─────────────────────────────────────────────
import { TODAY } from './constants'

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDateRange(start, end) {
  return `${formatDate(start)} - ${formatDate(end)}`
}

export function formatCurrency(val) {
  return `$${Number(val).toFixed(2)}`
}

// Format a Date as YYYY-MM-DD using its LOCAL calendar fields. Our date inputs
// are built at local midnight, so toISOString() (UTC) would shift the day for
// users whose zone differs from UTC. Always emit in local terms to stay consistent.
export function toLocalYMD(dt) {
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Date+time label for audit/history rows.
export function formatTimestamp(iso) {
  try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return '—' }
}

// Promotion lifecycle status relative to the reference date (TODAY keeps demo
// seed statuses stable; single source of truth instead of a hardcoded literal).
export function computeStatus(startDate, endDate) {
  if (startDate <= TODAY && endDate >= TODAY) return 'active'
  if (startDate > TODAY) return 'upcoming'
  return 'ended'
}

// Latest rejection reason from an approval history, or null.
export function latestRejectionReason(record) {
  const h = [...((record && record.approval_history) || [])].reverse().find((x) => x.to === 'rejected' && x.note)
  return h ? h.note : null
}
