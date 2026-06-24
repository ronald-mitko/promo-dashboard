import { formatDateRange } from '../lib/helpers'
import { REQUEST_TYPE_LABELS } from '../lib/constants'
import RequestStatusBadge from '../components/RequestStatusBadge'
import ApprovalControls from '../components/ApprovalControls'

// RCSM home: everything routed to the signed-in RCSM, pending approval.
export default function InboxView({ session, promotions, requests, onApprovePromo, onRejectPromo, onApproveRequest, onRejectRequest, onExportRequest }) {
  const myId = session.rcsmId
  const myPromos = promotions.filter((p) => p.routed_rcsm === myId && p.submission_status !== 'draft')
  const myRequests = requests.filter((r) => r.routed_rcsm === myId)

  const pending =
    myPromos.filter((p) => p.submission_status === 'submitted').length +
    myRequests.filter((r) => r.status === 'submitted').length

  const Empty = ({ text }) => (
    <div className="text-center py-10 text-sm text-green-4/40">{text}</div>
  )

  return (
    <div className="animate-fade-in-up space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-green-4/8 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-3/15 text-orange-3 flex items-center justify-center font-bold">{pending}</div>
        <div>
          <div className="text-sm font-bold text-green-4">{pending} item{pending !== 1 ? 's' : ''} awaiting your approval</div>
          <div className="text-xs text-green-4/50">Routed to you based on account ownership</div>
        </div>
      </div>

      {/* Priorities routed to this RCSM */}
      <section>
        <h3 className="text-sm font-bold text-green-3 uppercase tracking-wider mb-3">Priorities</h3>
        {myPromos.length === 0 ? (
          <Empty text="No priorities routed to you yet." />
        ) : (
          <div className="space-y-3">
            {myPromos.map((p) => (
              <div key={p.promo_id} className="bg-white rounded-2xl shadow-sm border border-green-4/8 p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1">
                    <RequestStatusBadge status={p.submission_status} />
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700">{p.promo_type}</span>
                  </div>
                  <div className="text-sm font-bold text-green-4">{p.product}</div>
                  <div className="text-xs text-green-4/50 mt-0.5">{p.retailer} · {p.brand} · {formatDateRange(p.start_date, p.end_date)}</div>
                  {p.submitted_by && <div className="text-[11px] text-green-4/40 mt-0.5">Submitted by {p.submitted_by}</div>}
                </div>
                <ApprovalControls
                  status={p.submission_status}
                  onApprove={() => onApprovePromo(p.promo_id)}
                  onReject={(note) => onRejectPromo(p.promo_id, note)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Workflow requests routed to this RCSM */}
      <section>
        <h3 className="text-sm font-bold text-green-3 uppercase tracking-wider mb-3">Requests</h3>
        {myRequests.length === 0 ? (
          <Empty text="No workflow requests routed to you yet." />
        ) : (
          <div className="space-y-3">
            {myRequests.map((r) => (
              <div key={r.requestId} className="bg-white rounded-2xl shadow-sm border border-green-4/8 p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1">
                    <RequestStatusBadge status={r.status} />
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-green-2/15 text-green-3">{REQUEST_TYPE_LABELS[r.type] || r.type}</span>
                  </div>
                  <div className="text-sm font-bold text-green-4">{r.clientName || '—'}{r.teamName ? ` · ${r.teamName}` : ''}</div>
                  <div className="text-xs text-green-4/50 mt-0.5">
                    {r.storeCount ? `${r.storeCount} stores · ` : ''}{r.itemCount ? `${r.itemCount} items` : ''}{r.newItems?.length ? `${r.newItems.length} new items` : ''}
                  </div>
                  {r.submittedBy && <div className="text-[11px] text-green-4/40 mt-0.5">Submitted by {r.submittedBy}</div>}
                </div>
                <ApprovalControls
                  status={r.status}
                  onApprove={() => onApproveRequest(r.requestId)}
                  onReject={(note) => onRejectRequest(r.requestId, note)}
                  exportLabel="Export"
                  onExport={onExportRequest ? () => onExportRequest(r.requestId) : undefined}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
