import { formatDateRange, latestRejectionReason } from '../lib/helpers'
import { PRIORITY_TYPE_LABELS } from '../lib/constants'
import RequestStatusBadge from '../components/RequestStatusBadge'
import RequestButtons from '../components/RequestButtons'
import BulkUpload from '../components/BulkUpload'

// Simple list of entered priorities with basic details + a per-row reporting request.
export default function PrioritiesListView({ promotions, role, onSubmitPromo, onEditPromo, onAddRequest, onAddPriority, onBulkImport }) {
  return (
    <div className="animate-fade-in-up">
      <div className="mb-4 flex flex-wrap items-start justify-end gap-3">
        {role === 'hq' && onBulkImport && <BulkUpload type="priority" onImport={onBulkImport} />}
        {role === 'hq' && onAddPriority && (
          <button onClick={onAddPriority} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-2 hover:bg-green-3 text-white font-bold text-sm transition-colors shadow-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Priority
          </button>
        )}
      </div>

      {promotions.length === 0 ? (
        <div className="text-center py-16 text-sm text-green-4/40 bg-white rounded-2xl border border-green-4/8">No priorities entered yet.</div>
      ) : (
        <div className="space-y-3">
          {promotions.map((p) => {
            const reason = p.submission_status === 'rejected' ? latestRejectionReason(p) : null
            const editable = p.submission_status === 'draft' || p.submission_status === 'rejected'
            return (
            <div key={p.promo_id} className="bg-white rounded-2xl shadow-sm border border-green-4/8 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2 mb-1">
                    <RequestStatusBadge status={p.submission_status} />
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-green-2/15 text-green-3">{PRIORITY_TYPE_LABELS[p.priority_type] || 'Promotion / Display'}</span>
                  </div>
                  <div className="text-sm font-bold text-green-4">{p.product}</div>
                  <div className="text-xs text-green-4/50 mt-0.5">{p.retailer} · {p.brand} · {p.promo_type} · {formatDateRange(p.start_date, p.end_date)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {role === 'hq' && editable && onEditPromo && (
                    <button onClick={() => onEditPromo(p)} className="px-3 py-1.5 rounded-lg border border-green-4/15 text-green-4/70 hover:border-green-2 text-xs font-bold transition-colors">Edit</button>
                  )}
                  {role === 'hq' && editable && onSubmitPromo && (
                    <button onClick={() => onSubmitPromo(p.promo_id)} className="px-3 py-1.5 rounded-lg bg-green-3 hover:bg-green-4 text-white text-xs font-bold transition-colors">{p.submission_status === 'rejected' ? 'Resubmit' : 'Submit'}</button>
                  )}
                  {/* Reporting can only be requested once a priority is submitted/approved */}
                  {(p.submission_status === 'submitted' || p.submission_status === 'approved') && onAddRequest && (
                    <RequestButtons
                      size="xs"
                      types={['reporting']}
                      onAddRequest={onAddRequest}
                      linkedPromo={{ promo_id: p.promo_id, retailer: p.retailer, chain: p.chain, brand: p.brand, product: p.product }}
                    />
                  )}
                </div>
              </div>
              {reason && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                  <span className="font-bold">Rejected:</span> {reason} — edit and resubmit.
                </div>
              )}
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
