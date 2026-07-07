import { useState } from 'react'
import { formatDateRange, formatTimestamp, latestRejectionReason } from '../lib/helpers'
import { REQUEST_TYPES, REQUEST_TYPE_LABELS, PRIORITY_TYPE_LABELS } from '../lib/constants'
import { rcsmName } from '../lib/routing'
import RequestStatusBadge from '../components/RequestStatusBadge'
import RequestButtons from '../components/RequestButtons'

const fmtTs = formatTimestamp

// Build label/value detail rows for the modal.
function promoDetail(p) {
  return [
    ['Product', p.product],
    ['Retailer', p.retailer],
    ['Brand', p.brand],
    ['Category', p.category],
    ['Priority type', PRIORITY_TYPE_LABELS[p.priority_type] || 'Promotion / Display'],
    ['Promo type', p.promo_type],
    ['Dates', formatDateRange(p.start_date, p.end_date)],
    ['Mechanic', p.mechanic],
    ['Retail price', p.retail_price != null ? `$${p.retail_price}` : '—'],
    ['Promo price', p.promo_price != null ? `$${p.promo_price}` : '—'],
    ['Expected lift', p.expected_lift != null ? `${p.expected_lift}%` : '—'],
    ['Display', p.display],
    ['Photo requested', p.photo_requested === 'yes' ? 'Yes' : 'No'],
    ['Submitted by', p.submitted_by || '—'],
    ['Submitted at', p.submitted_at ? fmtTs(p.submitted_at) : '—'],
  ]
}
function requestDetail(r) {
  const p = r.payload || {}
  return [
    ['Type', REQUEST_TYPE_LABELS[r.type] || r.type],
    ['Client', r.clientName],
    ['Team', r.teamName],
    ['Master chain', r.masterChain || '—'],
    ['Chains', (r.chains || []).join(', ') || '—'],
    ['Stores', r.stores?.length ? `${r.storeCount} (${r.stores.join(', ')})` : '—'],
    ['Items', r.items?.length ? String(r.itemCount) : '—'],
    ['Reason', p.reasonCode || '—'],
    ['Frequency', p.frequency || '—'],
    ['Dates', p.startDate ? formatDateRange(p.startDate, p.endDate) : '—'],
    ['Auth type', p.authType || '—'],
    ['Effective', p.effectiveDate || '—'],
    ['Comment', r.comment || '—'],
    ['Submitted by', r.submittedBy || '—'],
    ['Submitted at', r.submittedAt ? fmtTs(r.submittedAt) : '—'],
  ]
}

export default function MySubmissionsView({ promotions, requests, rcsms, onAddRequest }) {
  const [selected, setSelected] = useState(null) // { raw, kind, isRequest }

  const submittedPromos = promotions.filter((p) => p.submission_status && p.submission_status !== 'draft')

  const rows = [
    ...submittedPromos.map((p) => ({
      key: p.promo_id, type: 'promo', isRequest: false, raw: p,
      kind: 'Priority', label: p.product,
      meta: `${p.retailer} · ${p.promo_type} · ${formatDateRange(p.start_date, p.end_date)}`,
      status: p.submission_status, routed: rcsmName(p.routed_rcsm, rcsms),
      reason: p.submission_status === 'rejected' ? latestRejectionReason(p) : null,
      linked: { promo_id: p.promo_id, retailer: p.retailer, chain: p.chain, brand: p.brand, product: p.product },
    })),
    ...requests.map((r) => ({
      key: r.requestId, type: r.type, isRequest: true, raw: r,
      kind: REQUEST_TYPE_LABELS[r.type] || r.type, label: r.clientName || '—',
      meta: [r.storeCount && `${r.storeCount} stores`, r.itemCount && `${r.itemCount} items`, r.newItems?.length && `${r.newItems.length} new items`].filter(Boolean).join(' · '),
      status: r.status, routed: rcsmName(r.routed_rcsm, rcsms),
      reason: r.status === 'rejected' ? latestRejectionReason(r) : null,
      linked: { promo_id: r.requestId, retailer: r.retailer, chain: r.masterChain || r.chain, brand: r.clientName, product: `${REQUEST_TYPE_LABELS[r.type] || r.type} — ${r.clientName || ''}` },
    })),
  ]

  if (rows.length === 0) {
    return (
      <div className="animate-fade-in-up text-center py-20">
        <h3 className="text-lg font-bold text-green-4/70 mb-1">Nothing submitted yet</h3>
        <p className="text-sm text-green-4/40">Submit a priority or build a request to send it to the owning RCSM.</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up">
      <div className="bg-white rounded-2xl shadow-sm border border-green-4/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-green-4/8 text-left text-xs font-bold text-green-4/50 uppercase tracking-wider">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Routed to</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} onClick={() => setSelected(row)} className="border-b border-green-4/5 last:border-0 hover:bg-cream/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-semibold text-green-3 whitespace-nowrap">{row.kind}</td>
                  <td className="px-4 py-3 font-medium text-green-4">
                    {row.label}
                    {row.reason && <div className="text-[11px] font-normal text-red-600 mt-0.5">Rejected: {row.reason}</div>}
                  </td>
                  <td className="px-4 py-3 text-green-4/60">{row.meta}</td>
                  <td className="px-4 py-3 text-green-4/70 whitespace-nowrap">{row.routed}</td>
                  <td className="px-4 py-3"><RequestStatusBadge status={row.status} /></td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-3">
                      {onAddRequest && row.type !== REQUEST_TYPES.AUTHORIZE && (
                        <RequestButtons size="xs" types={['reporting']} onAddRequest={onAddRequest} linkedPromo={row.linked} />
                      )}
                      <button onClick={() => setSelected(row)} className="text-green-3 hover:text-green-4 text-xs font-bold">Details</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-green-3 to-green-2 px-5 py-4 flex items-center justify-between">
              <div>
                <div className="text-white/70 text-xs font-semibold uppercase tracking-wider">{selected.kind}</div>
                <h3 className="text-white font-bold text-lg">{selected.label}</h3>
              </div>
              <RequestStatusBadge status={selected.status} />
            </div>
            <div className="p-5 space-y-1">
              {(selected.isRequest ? requestDetail(selected.raw) : promoDetail(selected.raw)).map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 py-1.5 border-b border-green-4/5 last:border-0">
                  <span className="text-xs font-semibold text-green-4/50 uppercase tracking-wider shrink-0">{label}</span>
                  <span className="text-sm text-green-4 text-right">{value}</span>
                </div>
              ))}

              {/* New items list (authorize / pricing) */}
              {selected.isRequest && selected.raw.newItems?.length > 0 && (
                <div className="pt-3">
                  <div className="text-xs font-bold text-green-4/50 uppercase tracking-wider mb-1">New Items</div>
                  {selected.raw.newItems.map((it, i) => (
                    <div key={i} className="text-sm text-green-4/80 border border-green-4/8 rounded-lg px-3 py-2 mb-1">
                      <span className="font-semibold">{it.upc}</span> — {it.description}
                      {it.expectedPrice ? <span className="text-green-3 font-semibold"> · exp ${it.expectedPrice}</span> : null}
                    </div>
                  ))}
                </div>
              )}

              {/* Approval history */}
              {selected.raw.approval_history?.length > 0 && (
                <div className="pt-3">
                  <div className="text-xs font-bold text-green-4/50 uppercase tracking-wider mb-1">History</div>
                  {selected.raw.approval_history.map((h, i) => (
                    <div key={i} className="text-xs text-green-4/60 py-0.5">
                      {fmtTs(h.at)} — {h.from || '—'} → <span className="font-semibold text-green-4">{h.to}</span> by {h.by}{h.note ? ` (“${h.note}”)` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
