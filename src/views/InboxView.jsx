import { useState } from 'react'
import { formatDateRange } from '../lib/helpers'
import { REQUEST_TYPE_LABELS, REQUEST_TYPES } from '../lib/constants'
import { perStoreMinutes, workflagStats, clientLoadPerStore, fmtMinutes } from '../lib/estimates'
import RequestStatusBadge from '../components/RequestStatusBadge'
import ApprovalControls from '../components/ApprovalControls'

const Row = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 py-1 border-b border-green-4/5 last:border-0">
    <span className="text-[11px] font-semibold text-green-4/50 uppercase tracking-wider shrink-0">{label}</span>
    <span className="text-sm text-green-4 text-right">{value || '—'}</span>
  </div>
)
const Stat = ({ label, value }) => (
  <div className="bg-cream rounded-lg p-2 text-center">
    <div className="text-lg font-bold text-green-3">{value}</div>
    <div className="text-[10px] text-green-4/50 uppercase tracking-wider">{label}</div>
  </div>
)

// Type-specific review detail shown when an inbox item is expanded.
function ReviewPanel({ raw, kind }) {
  if (kind === 'promotion') {
    const mins = perStoreMinutes(raw)
    return (
      <div className="mt-3 pt-3 border-t border-green-4/8">
        <Row label="Per-store time" value={`${fmtMinutes(mins)} (${raw.promo_type})`} />
        <Row label="Product" value={raw.product} />
        <Row label="Retailer" value={raw.retailer} />
        <Row label="Chains" value={(raw.chains || []).join(', ')} />
        <Row label="Brand / Category" value={`${raw.brand || '—'} · ${raw.category || '—'}`} />
        <Row label="Dates" value={formatDateRange(raw.start_date, raw.end_date)} />
        <Row label="Mechanic" value={raw.mechanic} />
        <Row label="Price" value={raw.retail_price != null ? `$${raw.retail_price} → $${raw.promo_price}` : '—'} />
        <Row label="Display" value={raw.display} />
      </div>
    )
  }
  if (raw.type === REQUEST_TYPES.WORKFLAG) {
    const s = workflagStats(raw)
    return (
      <div className="mt-3 pt-3 border-t border-green-4/8">
        <div className="grid grid-cols-3 gap-2 mb-2">
          <Stat label="Avg flags/store" value={s.avg} />
          <Stat label="Max/store" value={s.max} />
          <Stat label="Min/store" value={s.min} />
        </div>
        <Row label="Total work flags" value={`${s.totalFlags} (${raw.storeCount || 0} stores × ${raw.itemCount || 0} items)`} />
        <Row label="Per-store time" value={fmtMinutes(s.perStoreMinutes)} />
        <Row label="Est. total time" value={`${s.estTotalMinutes} min`} />
        <Row label="Chains" value={(raw.chains || []).join(', ')} />
        <Row label="Dates" value={raw.payload?.startDate ? formatDateRange(raw.payload.startDate, raw.payload.endDate) : '—'} />
      </div>
    )
  }
  if (raw.type === REQUEST_TYPES.AUTHORIZE) {
    return (
      <div className="mt-3 pt-3 border-t border-green-4/8">
        <Row label="Chains" value={(raw.chains || []).join(', ')} />
        <Row label="Auth type" value={raw.payload?.authType} />
        <Row label="Effective" value={raw.payload?.effectiveDate} />
        <div className="text-[11px] font-semibold text-green-4/50 uppercase tracking-wider mt-2 mb-1">New items ({raw.newItems?.length || 0})</div>
        {(raw.newItems || []).map((it, i) => (
          <div key={i} className="text-sm text-green-4/80 border border-green-4/8 rounded-lg px-3 py-2 mb-1">
            <span className="font-semibold">{it.upc}</span> — {it.description}
            <span className="text-green-4/50"> · {[it.brand, it.category, it.size, it.pack].filter(Boolean).join(' · ')}</span>
            {it.expectedPrice ? <span className="text-green-3 font-semibold"> · exp ${it.expectedPrice}</span> : null}
          </div>
        ))}
      </div>
    )
  }
  // support / reporting
  return (
    <div className="mt-3 pt-3 border-t border-green-4/8">
      {Object.entries(raw.payload || {}).map(([k, v]) => <Row key={k} label={k} value={String(v)} />)}
      <Row label="Comment" value={raw.comment} />
    </div>
  )
}

// RCSM home: items routed to the signed-in RCSM, grouped by client with the
// cumulative estimated minutes-of-work-per-store the RCSM weighs against contract.
export default function InboxView({ session, promotions, requests, onApprovePromo, onRejectPromo, onApproveRequest, onRejectRequest, onExportRequest, onExportPromo }) {
  const myId = session.rcsmId
  const [expanded, setExpanded] = useState({})
  const toggle = (k) => setExpanded((e) => ({ ...e, [k]: !e[k] }))

  const myPromos = promotions.filter((p) => p.routed_rcsm === myId && p.submission_status !== 'draft')
  const myRequests = requests.filter((r) => r.routed_rcsm === myId)
  const items = [
    ...myPromos.map((p) => ({ key: p.promo_id, kind: 'promotion', client: p.clientName || p.brand || 'Unassigned', status: p.submission_status, raw: p })),
    ...myRequests.map((r) => ({ key: r.requestId, kind: 'request', client: r.clientName || 'Unassigned', status: r.status, raw: r })),
  ]
  const pending = items.filter((i) => i.status === 'submitted').length

  const byClient = {}
  items.forEach((it) => { (byClient[it.client] = byClient[it.client] || []).push(it) })
  const groups = Object.entries(byClient).sort((a, b) => a[0].localeCompare(b[0]))

  if (items.length === 0) {
    return (
      <div className="animate-fade-in-up text-center py-20">
        <h3 className="text-lg font-bold text-green-4/70 mb-1">Nothing routed to you yet</h3>
        <p className="text-sm text-green-4/40">Submissions routed to you by account ownership will appear here.</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-green-4/8 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-3/15 text-orange-3 flex items-center justify-center font-bold">{pending}</div>
        <div>
          <div className="text-sm font-bold text-green-4">{pending} item{pending !== 1 ? 's' : ''} awaiting your approval</div>
          <div className="text-xs text-green-4/50">Grouped by client · estimated work time shown per store</div>
        </div>
      </div>

      {groups.map(([client, its]) => {
        const load = clientLoadPerStore(its.map((i) => i.raw))
        const clientPending = its.filter((i) => i.status === 'submitted').length
        return (
          <section key={client} className="bg-white rounded-2xl shadow-sm border border-green-4/8 overflow-hidden">
            {/* Client header with cumulative per-store load */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-green-3/5 border-b border-green-4/8">
              <div>
                <div className="text-sm font-bold text-green-4">{client}</div>
                <div className="text-xs text-green-4/50">{its.length} item{its.length !== 1 ? 's' : ''}{clientPending ? ` · ${clientPending} pending` : ''}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-green-3">{fmtMinutes(load)}<span className="text-xs font-medium text-green-4/50">/store</span></div>
                <div className="text-[10px] text-green-4/50 uppercase tracking-wider">Est. work per store</div>
              </div>
            </div>

            <div className="divide-y divide-green-4/5">
              {its.map((it) => {
                const isPromo = it.kind === 'promotion'
                const mins = perStoreMinutes(it.raw)
                return (
                  <div key={it.key} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-1">
                          <RequestStatusBadge status={it.status} />
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${isPromo ? 'bg-gray-100 text-gray-700' : 'bg-green-2/15 text-green-3'}`}>{isPromo ? it.raw.promo_type : (REQUEST_TYPE_LABELS[it.raw.type] || it.raw.type)}</span>
                          {mins > 0 && <span className="text-[11px] font-semibold text-orange-3">+{fmtMinutes(mins)}/store</span>}
                        </div>
                        <div className="text-sm font-bold text-green-4">{isPromo ? it.raw.product : (it.raw.clientName || '—')}</div>
                        <div className="text-xs text-green-4/50 mt-0.5">
                          {isPromo
                            ? `${it.raw.retailer} · ${formatDateRange(it.raw.start_date, it.raw.end_date)}`
                            : [it.raw.storeCount && `${it.raw.storeCount} stores`, it.raw.itemCount && `${it.raw.itemCount} items`, it.raw.newItems?.length && `${it.raw.newItems.length} new items`].filter(Boolean).join(' · ')}
                        </div>
                        {(it.raw.submitted_by || it.raw.submittedBy) && <div className="text-[11px] text-green-4/40 mt-0.5">Submitted by {it.raw.submitted_by || it.raw.submittedBy}</div>}
                        <button onClick={() => toggle(it.key)} className="text-xs font-bold text-green-3 hover:text-green-4 mt-1">{expanded[it.key] ? 'Hide details' : 'Review details'}</button>
                      </div>
                      <ApprovalControls
                        status={it.status}
                        onApprove={() => (isPromo ? onApprovePromo(it.key) : onApproveRequest(it.key))}
                        onReject={(note) => (isPromo ? onRejectPromo(it.key, note) : onRejectRequest(it.key, note))}
                        exportLabel="Export"
                        onExport={() => (isPromo ? onExportPromo(it.key) : onExportRequest(it.key))}
                      />
                    </div>
                    {expanded[it.key] && <ReviewPanel raw={it.raw} kind={it.kind} />}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
