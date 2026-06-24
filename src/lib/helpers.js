// ─────────────────────────────────────────────
// Shared formatting helpers (used by App.jsx and views)
// ─────────────────────────────────────────────

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
