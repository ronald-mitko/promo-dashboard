import { useState } from 'react'

// Approve / Reject controls shown to the RCSM for a submitted item.
// When `approveReasons` is provided, approving requires picking a reason first
// (used for Home Location Checks → WorkFlag1ReasonJoin). onApprove receives it.
export default function ApprovalControls({ status, onApprove, onReject, exportLabel, onExport, approveReasons }) {
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [approving, setApproving] = useState(false)
  const [reason, setReason] = useState('')

  const inputCls = 'bg-white border border-green-4/15 rounded-lg px-2.5 py-1.5 text-xs text-green-4 focus:outline-none focus:ring-2 focus:ring-green-2/40'

  if (status === 'submitted') {
    if (approving) {
      return (
        <div className="flex flex-col gap-2 items-stretch min-w-[180px]">
          <select autoFocus value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
            <option value="">Select a reason…</option>
            {approveReasons.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
          </select>
          <div className="flex gap-2">
            <button
              disabled={!reason}
              onClick={() => { onApprove(reason); setApproving(false); setReason('') }}
              className={`flex-1 px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-colors ${reason ? 'bg-green-2 hover:bg-green-3' : 'bg-green-2/40 cursor-not-allowed'}`}
            >
              Confirm approve
            </button>
            <button onClick={() => { setApproving(false); setReason('') }} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-green-4/60 text-xs font-bold transition-colors">Cancel</button>
          </div>
        </div>
      )
    }
    if (rejecting) {
      return (
        <div className="flex flex-col gap-2 items-stretch">
          <input
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason (required)"
            className="bg-white border border-green-4/15 rounded-lg px-2.5 py-1.5 text-xs text-green-4 focus:outline-none focus:ring-2 focus:ring-green-2/40"
          />
          <div className="flex gap-2">
            <button
              disabled={!note.trim()}
              onClick={() => { onReject(note.trim()); setRejecting(false); setNote('') }}
              className={`flex-1 px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-colors ${note.trim() ? 'bg-red-500 hover:bg-red-600' : 'bg-red-300 cursor-not-allowed'}`}
            >
              Confirm reject
            </button>
            <button onClick={() => { setRejecting(false); setNote('') }} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-green-4/60 text-xs font-bold transition-colors">Cancel</button>
          </div>
        </div>
      )
    }
    const hasReasons = approveReasons && approveReasons.length > 0
    return (
      <div className="flex gap-2">
        <button onClick={() => (hasReasons ? setApproving(true) : onApprove())} className="px-3 py-1.5 rounded-lg bg-green-2 hover:bg-green-3 text-white text-xs font-bold transition-colors">Approve</button>
        <button onClick={() => setRejecting(true)} className="px-3 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 text-xs font-bold transition-colors">Reject</button>
      </div>
    )
  }

  if (status === 'approved' && onExport) {
    return (
      <button onClick={onExport} className="px-3 py-1.5 rounded-lg border border-green-3/40 text-green-3 hover:bg-green-2/10 text-xs font-bold transition-colors">
        {exportLabel || 'Export'}
      </button>
    )
  }

  return null
}
