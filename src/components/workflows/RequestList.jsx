import RequestStatusBadge from '../RequestStatusBadge'
import RequestButtons from '../RequestButtons'
import { REQUEST_TYPES, REQUEST_TYPE_LABELS } from '../../lib/constants'
import { latestRejectionReason } from '../../lib/helpers'

// Table of requests for one type, with a Clone action + per-row reporting (not for authorize).
export default function RequestList({ requests, onClone, onAddRequest }) {
  if (requests.length === 0) {
    return <div className="text-center py-12 text-sm text-green-4/40 bg-white rounded-2xl border border-green-4/8">No requests yet. Click “New request” to build one.</div>
  }
  const fmt = (iso) => { try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } catch { return '—' } }
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-green-4/8 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-green-4/8 text-left text-xs font-bold text-green-4/50 uppercase tracking-wider">
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Summary</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const reason = r.status === 'rejected' ? latestRejectionReason(r) : null
              return (
              <tr key={r.requestId} className="border-b border-green-4/5 last:border-0 hover:bg-cream/50 transition-colors">
                <td className="px-4 py-3 text-green-4/70 whitespace-nowrap">{fmt(r.submittedAt)}</td>
                <td className="px-4 py-3 font-medium text-green-4">
                  {r.clientName || '—'}
                  {reason && <div className="text-[11px] font-normal text-red-600 mt-0.5">Rejected: {reason}</div>}
                </td>
                <td className="px-4 py-3 text-green-4/60">
                  {[r.storeCount && `${r.storeCount} stores`, r.itemCount && `${r.itemCount} items`, r.newItems?.length && `${r.newItems.length} new items`, r.chains?.length && `${r.chains.length} chains`].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="px-4 py-3"><RequestStatusBadge status={r.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    {onAddRequest && r.type !== REQUEST_TYPES.AUTHORIZE && (
                      <RequestButtons
                        size="xs"
                        types={['reporting']}
                        onAddRequest={onAddRequest}
                        linkedPromo={{ promo_id: r.requestId, retailer: r.retailer, chain: r.masterChain || r.chain, brand: r.clientName, product: `${REQUEST_TYPE_LABELS[r.type] || r.type} — ${r.clientName || ''}` }}
                      />
                    )}
                    {onClone && <button onClick={() => onClone(r)} className="text-green-3 hover:text-green-4 text-xs font-bold">{reason ? 'Edit & resubmit' : 'Clone'}</button>}
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
