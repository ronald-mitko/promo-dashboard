// ─────────────────────────────────────────────
// EXPORT — build downstream output per request type.
// Workflag mirrors the workflag-submission CSV format; other types produce a
// clean structured CSV until the exact target format is supplied.
// ─────────────────────────────────────────────
import { REQUEST_TYPES } from './constants'

function mmddyyyy(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

function csvEscape(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(rows) {
  return rows.map((r) => r.map(csvEscape).join(',')).join('\n')
}

// Workflag: Store × Item rows, reason doubled when every_call (reference format).
function buildWorkflag(req) {
  const p = req.payload || {}
  const reason = p.frequency === 'every_call' ? `${p.reasonCode}${p.reasonCode}` : p.reasonCode
  const header = ['Store', 'ProductPack', 'Team', 'WorkFlag1ReasonJoin', 'WorkFlag1Start', 'WorkFlag1End', 'Inventory1', 'SubmissionKey', 'SubmissionTypeID']
  const rows = [header]
  ;(req.stores || []).forEach((store) => {
    ;(req.items || []).forEach((upc) => {
      rows.push([store, String(upc).padStart(12, '0'), req.teamName || '', reason || '', mmddyyyy(p.startDate), mmddyyyy(p.endDate), '', req.requestId || '', '1'])
    })
  })
  return { filename: `WORKFLAG_${req.requestId || 'export'}.csv`, content: toCsv(rows) }
}

// Authorize / Pricing: one row per (chain × new item) with full item detail.
function buildAuthorize(req) {
  const p = req.payload || {}
  const prefix = (req.type || 'authorize').toUpperCase()
  const header = ['Chain', 'UPC', 'Description', 'Brand', 'Category', 'Family', 'Size', 'Pack', 'ExpectedPrice', 'AuthType', 'EffectiveDate']
  const rows = [header]
  ;(req.chains || []).forEach((chain) => {
    ;(req.newItems || []).forEach((it) => {
      rows.push([chain, it.upc, it.description, it.brand, it.category, it.family, it.size, it.pack, it.expectedPrice || '', p.authType || '', mmddyyyy(p.effectiveDate)])
    })
  })
  return { filename: `${prefix}_${req.requestId || 'export'}.csv`, content: toCsv(rows) }
}

// Support / Reporting: flat key/value export.
function buildGeneric(req) {
  const p = req.payload || {}
  const rows = [['Field', 'Value']]
  rows.push(['Type', req.type], ['Client', req.clientName || ''], ['Retailer', req.retailer || ''], ['Linked priority', req.linked_promo_id || ''])
  Object.entries(p).forEach(([k, v]) => rows.push([k, v]))
  rows.push(['Comment', req.comment || ''])
  return { filename: `${(req.type || 'request').toUpperCase()}_${req.requestId || 'export'}.csv`, content: toCsv(rows) }
}

// Priority (promotion): one row of the entered detail.
function buildPriority(p) {
  const header = ['Client', 'Retailer', 'Chains', 'Product', 'Brand', 'Category', 'PromoType', 'Start', 'End', 'Mechanic', 'RetailPrice', 'PromoPrice', 'Display']
  const row = [p.clientName || '', p.retailer || '', (p.chains || []).join('; '), p.product, p.brand, p.category, p.promo_type, mmddyyyy(p.start_date), mmddyyyy(p.end_date), p.mechanic, p.retail_price, p.promo_price, p.display]
  return { filename: `PRIORITY_${p.promo_id || 'export'}.csv`, content: toCsv([header, row]) }
}

export function buildExport(rec) {
  // Promotions (priorities) have a promo_id / kind 'promotion'; requests have a type.
  if (rec.kind === 'promotion' || rec.promo_id) return buildPriority(rec)
  switch (rec.type) {
    case REQUEST_TYPES.WORKFLAG: return buildWorkflag(rec)
    case REQUEST_TYPES.AUTHORIZE: return buildAuthorize(rec)
    default: return buildGeneric(rec)
  }
}

// Trigger a browser download of the export for a request.
export function downloadExport(req) {
  const { filename, content } = buildExport(req)
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
